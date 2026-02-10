const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FiscalService = require('../services/FiscalService');
const AdmZip = require('adm-zip');

// Obter Configurações Fiscais
exports.getFiscalConfig = async (req, res) => {
  const { restaurantId } = req.user;
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
  const { restaurantId } = req.user;
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
    const { restaurantId } = req.user;
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
    const { restaurantId } = req.user;
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
    const { restaurantId } = req.user;
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
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao processar nota.' });
    }
};

// Fechamento Mensal: Exportar XMLs para o contador
exports.exportMonthlyXmls = async (req, res) => {
    const { restaurantId } = req.user;
    const { month, year } = req.query; // Ex: month=10, year=2025

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
            const xmlContent = inv.xml || `<!-- XML Placeholder para nota ${inv.number} (conteúdo não encontrado) -->`;
            zip.addFile(`${inv.accessKey}.xml`, Buffer.from(xmlContent, 'utf-8'));
        });

        const zipBuffer = zip.toBuffer();
        
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename=XMLs_${month}_${year}.zip`);
        res.send(zipBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao exportar XMLs.' });
    }
};