const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');

router.post('/pix/:orderId', PaymentController.generatePix);
router.get('/pix/:orderId/status', PaymentController.checkStatus);

module.exports = router;
