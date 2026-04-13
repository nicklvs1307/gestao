const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const CustomerController = require('../controllers/CustomerController');
const CustomerImportService = require('../services/CustomerImportService');
const { needsAuth } = require('../middlewares/auth');
const prisma = require('../lib/prisma');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', needsAuth, CustomerController.index);
router.post('/', needsAuth, CustomerController.store);

router.post('/import', needsAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        
        if (!allowedMimes.includes(req.file.mimetype) && !req.file.originalname.match(/\.(xlsx|xls)$/i)) {
            return res.status(400).json({ error: 'Apenas arquivos Excel (.xlsx, .xls) são permitidos.' });
        }

        const result = await CustomerImportService.importFromExcel(req.restaurantId, req.file.buffer);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao importar clientes:', error);
        res.status(500).json({ error: error.message || 'Erro ao importar clientes.' });
    }
});

router.get('/template', needsAuth, (req, res) => {
    try {
        const buffer = CustomerImportService.generateTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=modelo_clientes.xlsx');
        res.send(buffer);
    } catch (error) {
        logger.error('Erro ao gerar modelo:', error);
        res.status(500).json({ error: 'Erro ao gerar modelo.' });
    }
});
router.get('/search', needsAuth, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const cleanQuery = query.toString().replace(/\D/g, '');

        const customers = await prisma.customer.findMany({
            where: {
                restaurantId: req.restaurantId,
                OR: [
                    { phone: { contains: cleanQuery && cleanQuery.length > 0 ? cleanQuery : '___NOMATCH___' } },
                    { name: { contains: query.toString(), mode: 'insensitive' } },
                    { address: { contains: query.toString(), mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                name: true,
                phone: true,
                zipCode: true,
                street: true,
                number: true,
                neighborhood: true,
                city: true,
                state: true,
                complement: true,
                reference: true,
                address: true,
                customerAddresses: {
                    select: {
                        id: true,
                        label: true,
                        street: true,
                        number: true,
                        complement: true,
                        neighborhood: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        reference: true
                    }
                },
                deliveryOrders: {
                    select: {
                        address: true,
                        deliveryType: true,
                        complement: true,
                        reference: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
            take: 15,
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ customers });
    } catch (error) {
        logger.error("Erro ao buscar clientes:", error);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});
router.get('/:id', needsAuth, CustomerController.show);
router.put('/:id', needsAuth, CustomerController.update);
router.delete('/:id', needsAuth, CustomerController.delete);

// Rotas de endereços
router.get('/:customerId/addresses', needsAuth, CustomerController.listAddresses);
router.post('/:customerId/addresses', needsAuth, CustomerController.createAddress);
router.put('/addresses/:id', needsAuth, CustomerController.updateAddress);
router.delete('/addresses/:id', needsAuth, CustomerController.deleteAddress);

module.exports = router;
