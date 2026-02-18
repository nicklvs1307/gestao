const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const upload = require('../config/multer');

router.get('/', needsAuth, checkPermission('checklists:view'), ChecklistController.index);
router.get('/history', needsAuth, checkPermission('checklists:view'), ChecklistController.executions);
router.get('/:id', ChecklistController.show); // Público para QR Code
router.post('/', needsAuth, checkPermission('checklists:manage'), ChecklistController.store);
router.put('/:id', needsAuth, checkPermission('checklists:manage'), ChecklistController.update);
router.delete('/:id', needsAuth, checkPermission('checklists:manage'), ChecklistController.delete);

// Configurações de Relatório
router.get('/settings/report', needsAuth, checkPermission('checklists:manage'), ChecklistController.getReportSettings);
router.put('/settings/report', needsAuth, checkPermission('checklists:manage'), ChecklistController.updateReportSettings);

// Execução
router.post('/submit', ChecklistController.submitExecution); // Público para QR Code
router.post('/upload', upload.single('file'), ChecklistController.uploadFile); // Upload de fotos

module.exports = router;
