const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const verifyToken = require('../middlewares/auth');

// Middleware básico de autenticação
router.use(verifyToken.needsAuth);

// DRE e Performance (Já existiam)
router.get('/dre', ReportController.getDre);
router.get('/performance/staff', ReportController.getStaffPerformance);

// Novos Métodos Migrados
router.get('/summary', ReportController.getSummary);
router.get('/sales-history', ReportController.getSalesHistory);
router.get('/payment-methods', ReportController.getPaymentMethodsReport);
router.get('/dashboard-stats', ReportController.getDashboardStats);
router.get('/sales-period', ReportController.getSalesPeriod);
router.get('/top-products', ReportController.getTopProducts);
router.get('/abc-analysis', ReportController.getAbcAnalysis);
router.get('/delivery-area-stats', ReportController.getDeliveryAreaStats);
router.get('/detailed-payments', ReportController.getDetailedPayments);
router.get('/consumed-items', ReportController.getConsumedItems);
router.get('/hourly-sales', ReportController.getHourlySales);
router.get('/sales-heatmap', ReportController.getSalesHeatmap);

module.exports = router;