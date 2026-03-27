const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const FiscalService = require('../services/FiscalService');
const axios = require('axios');
const AdmZip = require('adm-zip');
const forge = require('node-forge');

// Obter Configurações Fiscais
exports.getFiscalConfig = async (req, res) => {
  const { restaurantId } = req;
  try {
    let config = await prisma.restaurantFiscalConfig.findUnique({
      where: { restaurantId }
    });
    
    if (!config) {
        return res.json({}); 
    }
    
    config.certPassword = undefined;
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações fiscais.' });
  }
};

// Salvar/Atualizar Configurações Fiscais
exports.saveFiscalConfig = async (req, res) => {
  const { restaurantId } = req;
  const { 
    companyName, cnpj, ie, im, taxRegime,
    zipCode, street, number, complement, neighborhood, city, state, ibgeCode,
    provider, environment, token, cscId, cscToken, emissionMode
  } = req.body;

  try {
    const config = await prisma.restaurantFiscalConfig.upsert({
      where: { restaurantId },
      update: {
        companyName, cnpj, ie, im, taxRegime,
        zipCode, street, number, complement, neighborhood, city, state, ibgeCode,
        provider, environment, token, cscId, cscToken, emissionMode
      },
      create: {
        restaurantId,
        companyName, cnpj, ie, im, taxRegime,
        zipCode, street, number, complement, neighborhood, city, state, ibgeCode,
        provider, environment, token, cscId, cscToken, emissionMode
      }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar config fiscal.' });
  }
};

// Upload do Certificado A1
exports.uploadCertificate = async (req, res) => {
    const { restaurantId } = req;
    const { password } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'Arquivo de certificado não enviado.' });
    if (!password) return res.status(400).json({ error: 'Senha do certificado é obrigatória.' });

    try {
        const certBase64 = req.file.buffer.toString('base64');
        FiscalService._extractCertData(certBase64, password);

        await prisma.restaurantFiscalConfig.upsert({
            where: { restaurantId },
            update: { certificate: certBase64, certPassword: password },
            create: { restaurantId, certificate: certBase64, certPassword: password }
        });

        res.json({ message: 'Certificado instalado com sucesso!' });
    } catch (error) {
        res.status(400).json({ error: 'Senha incorreta ou certificado inválido.' });
    }
};

// Listar Notas Fiscais
exports.getInvoices = async (req, res) => {
    const { restaurantId } = req;
    const { page = 1, limit = 20 } = req.query;
    try {
        const invoices = await prisma.invoice.findMany({
            where: { restaurantId },
            orderBy: { issuedAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notas fiscais.' });
    }
};

// Emitir Nota Fiscal (Envio Manual)
exports.emitInvoice = async (req, res) => {
    const { restaurantId } = req;
    const { orderId } = req.body;

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } }
        });
        
        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId }
        });

        if (!fiscalConfig?.certificate) {
            return res.status(400).json({ error: 'Certificado A1 não instalado.' });
        }

        // Busca última nota para sequenciamento
        const lastInvoice = await prisma.invoice.findFirst({
            where: { restaurantId, type: 'NFCe' },
            orderBy: { number: 'desc' }
        });

        const nextNumber = (lastInvoice?.number || 0) + 1;
        const serie = 1; // Pode ser parametrizado na config fiscal

        const result = await FiscalService.autorizarNfce(order, fiscalConfig, order.items, nextNumber, serie);

        if (result.success) {
            // Extrai o protocolo e status da resposta SEFAZ
            const body = result.data['soap:Envelope']?.['soap:Body'] || result.data['Envelope']?.['Body'];
            const retEnvi = body?.['nfeResultMsg']?.['retEnviNFe'] || body?.['retEnviNFe'];
            const protNFe = retEnvi?.protNFe?.infProt || retEnvi?.protNFe;
            const cStat = protNFe?.cStat;

            // cStat 100 é Autorizado, 150 é Autorizado fora do prazo
            if (cStat === 100 || cStat === 150 || cStat === '100' || cStat === '150') {
                const invoice = await prisma.invoice.create({
                    data: {
                        restaurantId,
                        orderId,
                        type: 'NFCe',
                        status: 'AUTHORIZED',
                        number: nextNumber,
                        series: serie,
                        accessKey: result.accessKey,
                        xml: result.xml,
                        protocol: protNFe?.nProt?.toString(),
                        issuedAt: new Date()
                    }
                });
                res.json({ message: 'Nota emitida e autorizada com sucesso!', invoice });
            } else {
                const motivo = protNFe?.xMotivo || 'Erro na autorização SEFAZ';
                res.status(400).json({ error: `SEFAZ Rejeitou: [${cStat}] ${motivo}` });
            }
        } else {
            res.status(400).json({ error: `Erro SEFAZ: ${result.error}` });
        }

    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro interno ao processar nota.' });
    }
};

// Fechamento Mensal: Exportar XMLs para o contador
exports.exportMonthlyXmls = async (req, res) => {
    const { restaurantId } = req;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const invoices = await prisma.invoice.findMany({
            where: {
                restaurantId,
                status: 'AUTHORIZED',
                issuedAt: { gte: startDate, lte: endDate }
            }
        });

        if (invoices.length === 0) {
            return res.status(404).json({ error: 'Nenhuma nota encontrada para este período.' });
        }

        const zip = new AdmZip();
        
        invoices.forEach(inv => {
            const xmlContent = inv.xml || `<!-- XML Placeholder para nota ${inv.number} -->`;
            zip.addFile(`${inv.accessKey}.xml`, Buffer.from(xmlContent, 'utf-8'));
        });

        const zipBuffer = zip.toBuffer();
        
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename=XMLs_${month}_${year}.zip`);
        res.send(zipBuffer);

    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao exportar XMLs.' });
    }
};

// Status do Certificado (validade e aviso de expiração)
exports.getCertificateStatus = async (req, res) => {
    const { restaurantId } = req;
    try {
        const config = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId }
        });

        if (!config?.certificate) {
            return res.json({ installed: false });
        }

        try {
            const pfxDer = Buffer.from(config.certificate, 'base64');
            const pfxAsn1 = forge.asn1.fromDer(forge.util.decode64(config.certificate));
            const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, config.certPassword);
            
            const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = certBags[forge.pki.oids.certBag][0];
            const cert = certBag.cert;
            
            const validNotBefore = cert.validity.notBefore;
            const validNotAfter = cert.validity.notAfter;
            const now = new Date();
            const daysUntilExpiry = Math.ceil((validNotAfter - now) / (1000 * 60 * 60 * 24));
            
            res.json({
                installed: true,
                validNotBefore: validNotBefore.toISOString(),
                validNotAfter: validNotAfter.toISOString(),
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0,
                warning: daysUntilExpiry > 0 && daysUntilExpiry <= 30,
                subject: cert.subject.attributes.map(a => a.value).join(', ')
            });
        } catch (e) {
            res.json({ installed: true, parseError: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar certificado.' });
    }
};

// Obter nota por ID com detalhes de erro
exports.getInvoiceById = async (req, res) => {
    const { restaurantId } = req;
    const { id } = req.params;
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, restaurantId },
            include: { order: true }
        });
        if (!invoice) {
            return res.status(404).json({ error: 'Nota não encontrada.' });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar nota.' });
    }
};

// Cancelar/Inutilizar NFC-e
exports.cancelInvoice = async (req, res) => {
    const { restaurantId } = req;
    const { invoiceId, reason } = req.body;

    if (!invoiceId || !reason) {
        return res.status(400).json({ error: 'ID da nota e motivo são obrigatórios.' });
    }

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, restaurantId }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Nota não encontrada.' });
        }

        if (invoice.status !== 'AUTHORIZED') {
            return res.status(400).json({ error: 'Apenas notas autorizadas podem ser canceladas.' });
        }

        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId }
        });

        if (!fiscalConfig?.certificate) {
            return res.status(400).json({ error: 'Certificado não configurado.' });
        }

        // Chama serviço de cancelamento
        const result = await FiscalService.cancelNfce(invoice, fiscalConfig, reason);

        if (result.success) {
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { 
                    status: 'CANCELED',
                    errorMessage: `Cancelada: ${reason} - Protocolo: ${result.protocol}`,
                    updatedAt: new Date()
                }
            });
            
            logger.info(`NFC-e ${invoice.number} cancelada com sucesso. Protocolo: ${result.protocol}`);
            res.json({ success: true, message: 'NFC-e cancelada com sucesso!', protocol: result.protocol });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        logger.error('Erro ao cancelar NFC-e:', error);
        res.status(500).json({ error: 'Erro ao processar cancelamento.' });
    }
};

// Consultar recibo na SEFAZ
exports.consultReceipt = async (req, res) => {
    const { restaurantId } = req;
    const { recibo } = req.params;

    if (!recibo) {
        return res.status(400).json({ error: 'Número do recibo é obrigatório.' });
    }

    try {
        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId }
        });

        if (!fiscalConfig?.certificate) {
            return res.status(400).json({ error: 'Certificado não configurado.' });
        }

        const result = await FiscalService.consultReceipt(recibo, fiscalConfig);

        if (result.success) {
            const protNFe = result.data?.protNFe;
            const cStat = protNFe?.cStat;
            
            // Atualiza status da nota se encontrou
            if (cStat === '100' || cStat === '150') {
                const invoice = await prisma.invoice.findFirst({
                    where: { restaurantId, accessKey: result.accessKey }
                });
                
                if (invoice) {
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: { 
                            status: 'AUTHORIZED',
                            protocol: protNFe?.nProt,
                            updatedAt: new Date()
                        }
                    });
                }
            }
            
            res.json({ success: true, status: cStat, data: result.data });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        logger.error('Erro ao consultar recibo:', error);
        res.status(500).json({ error: 'Erro ao consultar SEFAZ.' });
    }
};

// Relatório mensal resumido
exports.getMonthlyReport = async (req, res) => {
    const { restaurantId } = req;
    const { month, year } = req.query;

    if (!month || !year) return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const invoices = await prisma.invoice.findMany({
            where: {
                restaurantId,
                issuedAt: { gte: startDate, lte: endDate }
            },
            include: { order: true }
        });

        const authorized = invoices.filter(inv => inv.status === 'AUTHORIZED');
        const rejected = invoices.filter(inv => inv.status === 'REJECTED');
        const canceled = invoices.filter(inv => inv.status === 'CANCELED');
        const pending = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'PROCESSING');

        res.json({
            period: { month: parseInt(month), year: parseInt(year) },
            summary: {
                total: invoices.length,
                authorized: authorized.length,
                rejected: rejected.length,
                canceled: canceled.length,
                pending: pending.length,
                successRate: invoices.length > 0 ? (authorized.length / invoices.length * 100).toFixed(1) : 0
            },
            invoices: invoices.map(inv => ({
                id: inv.id,
                number: inv.number,
                status: inv.status,
                accessKey: inv.accessKey,
                issuedAt: inv.issuedAt,
                errorMessage: inv.errorMessage
            }))
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
};

// Gerar PDF DANFE
exports.generatePdf = async (req, res) => {
    const { restaurantId } = req;
    const { id } = req.params;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, restaurantId },
            include: { order: { include: { items: { include: { product: true } } } } }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Nota não encontrada.' });
        }

        if (invoice.status !== 'AUTHORIZED') {
            return res.status(400).json({ error: 'Apenas notas autorizadas podem gerar PDF.' });
        }

        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId }
        });

        const pdfBuffer = await FiscalService.generateDanfePdf(invoice, fiscalConfig, invoice.order);

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename=DANFE_${invoice.number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error('Erro ao gerar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF.' });
    }
};

// Validar CNPJ na ReceitaWS
exports.validateCnpj = async (req, res) => {
    const { cnpj } = req.params;
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
        return res.status(400).json({ valid: false, error: 'CNPJ deve ter 14 dígitos.' });
    }

    // Validação de dígitos
    let sum = 0;
    let weight = 2;
    for (let i = 11; i >= 0; i--) {
        sum += parseInt(cleanCnpj[i]) * weight;
        weight = weight === 9 ? 2 : weight + 1;
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    sum = 0;
    weight = 2;
    for (let i = 12; i >= 0; i--) {
        sum += parseInt(cleanCnpj[i]) * weight;
        weight = weight === 9 ? 2 : weight + 1;
    }
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (parseInt(cleanCnpj[12]) !== digit1 || parseInt(cleanCnpj[13]) !== digit2) {
        return res.json({ valid: false, error: 'Dígitos verificadores inválidos.' });
    }

    // Consulta simplews (opcional - pode falhar)
    try {
        const response = await axios.get(`https://ws.sintegra.gov.br/consulta/cnpj/${cleanCnpj}/json`, {
            timeout: 5000
        });
        if (response.data) {
            return res.json({ 
                valid: true, 
                data: {
                    cnpj: cleanCnpj,
                    nome: response.data.nome || response.data.razaoSocial,
                    fantasia: response.data.fantasia,
                    situacao: response.data.situacao,
                    logradouro: response.data.logradouro,
                    numero: response.data.numero,
                    bairro: response.data.bairro,
                    municipio: response.data.municipio,
                    uf: response.data.uf,
                    cep: response.data.cep
                }
            });
        }
    } catch (e) {
        // Se falhar a consulta, retorna só válido pelos dígitos
    }

    res.json({ valid: true, checked: false });
};

// Buscar CEP no ViaCEP
exports.searchCep = async (req, res) => {
    const { cep } = req.params;
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
        return res.status(400).json({ error: 'CEP inválido.' });
    }

    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (response.data.erro) {
            return res.status(404).json({ error: 'CEP não encontrado.' });
        }
        
        // Busca código IBGE
        const ibgeResponse = await axios.get(`https://servicodados.ibge.gov.br/api/v3/municipios/${response.data.uf}/${response.data.localidade}`);
        
        res.json({
            cep: response.data.cep,
            logradouro: response.data.logradouro,
            complemento: response.data.complemento,
            bairro: response.data.bairro,
            cidade: response.data.localidade,
            estado: response.data.uf,
            ibgeCode: response.data.ibge || (ibgeResponse.data[0]?.id)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar CEP.' });
    }
};