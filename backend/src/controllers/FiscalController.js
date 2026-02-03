const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obter Configurações Fiscais
exports.getFiscalConfig = async (req, res) => {
  const { restaurantId } = req.user;
  try {
    let config = await prisma.restaurantFiscalConfig.findUnique({
      where: { restaurantId }
    });
    
    // Se não existir, retorna objeto vazio ou cria default (opcional)
    if (!config) {
        return res.json({}); 
    }
    
    // Remove senha do certificado por segurança
    config.certPassword = undefined;
    
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar config fiscal:', error);
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
    console.error('Erro ao salvar config fiscal:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações fiscais.' });
  }
};

// Upload e Instalação do Certificado A1
exports.uploadCertificate = async (req, res) => {
    const { restaurantId } = req.user;
    const { password } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'Arquivo de certificado não enviado.' });
    if (!password) return res.status(400).json({ error: 'Senha do certificado é obrigatória.' });

    try {
        const certBase64 = req.file.buffer.toString('base64');

        // Testa se o certificado é válido e a senha está correta usando o FiscalService
        const FiscalService = require('../services/FiscalService');
        try {
            FiscalService._extractCertData(certBase64, password);
        } catch (e) {
            return res.status(400).json({ error: 'Senha incorreta ou certificado inválido.' });
        }

        await prisma.restaurantFiscalConfig.upsert({
            where: { restaurantId },
            update: { certificate: certBase64, certPassword: password },
            create: { restaurantId, certificate: certBase64, certPassword: password }
        });

        res.json({ message: 'Certificado instalado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar certificado.' });
    }
};

// Listar Notas Fiscais
exports.getInvoices = async (req, res) => {
    const { restaurantId } = req.user;
    try {
        const invoices = await prisma.invoice.findMany({
            where: { restaurantId },
            orderBy: { issuedAt: 'desc' },
            take: 50 // Limite para não pesar
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

        const FiscalService = require('../services/FiscalService');
        const result = await FiscalService.autorizarNfce(order, fiscalConfig, order.items);

        if (result.success) {
            const invoice = await prisma.invoice.create({
                data: {
                    restaurantId,
                    orderId,
                    type: 'NFCe',
                    status: 'AUTHORIZED',
                    issuedAt: new Date()
                    // Futuro: Salvar chave e XML retornado
                }
            });
            res.json({ message: 'Nota emitida com sucesso!', invoice });
        } else {
            res.status(400).json({ error: `Erro SEFAZ: ${result.error}` });
        }

    } catch (error) {
        console.error('Erro ao emitir nota:', error);
        res.status(500).json({ error: 'Erro interno ao processar nota.' });
    }
};
