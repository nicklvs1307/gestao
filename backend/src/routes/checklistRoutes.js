const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { needsAuth } = require('../middlewares/auth');
const upload = require('../config/multer');

router.get('/', needsAuth, ChecklistController.index);
router.get('/history', needsAuth, ChecklistController.executions);
router.get('/:id', ChecklistController.show); // Público para QR Code
router.post('/', needsAuth, ChecklistController.store);
router.put('/:id', needsAuth, ChecklistController.update);
router.delete('/:id', needsAuth, ChecklistController.delete);

// Execução
router.post('/submit', ChecklistController.submitExecution); // Público para QR Code
router.post('/upload', upload.single('file'), ChecklistController.uploadFile); // Upload de fotos

module.exports = router;
