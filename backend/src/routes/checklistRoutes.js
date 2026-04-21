const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const { checkModuleEnabled } = require('../middlewares/moduleGate');
const upload = require('../config/multer');
const validate = require('../middlewares/validate');
const { checklistStoreSchema, checklistSubmitSchema } = require('../schemas/checklistSchemas');
const rateLimit = require('express-rate-limit');

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Muitos envios de checklist. Tente novamente em 15 minutos." }
});

const publicReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { message: "Muitas requisições. Tente novamente em 1 minuto." }
});

router.get('/', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:view'), ChecklistController.index);
router.get('/available', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:view'), ChecklistController.getAvailableToday);
router.get('/history', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:view'), ChecklistController.executions);
router.get('/stats', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:view'), ChecklistController.stats);
router.get('/report/:executionId', publicReadLimiter, ChecklistController.getExecutionReport);
router.get('/:id', publicReadLimiter, ChecklistController.show);

router.post('/', 
  needsAuth, 
  checkModuleEnabled('checklists'),
  checkPermission('checklists:manage'), 
  validate(checklistStoreSchema),
  ChecklistController.store
);

router.put('/:id', 
  needsAuth, 
  checkModuleEnabled('checklists'),
  checkPermission('checklists:manage'), 
  validate(checklistStoreSchema),
  ChecklistController.update
);

router.delete('/:id', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.delete);

router.get('/settings/report', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.getReportSettings);
router.put('/settings/report', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.updateReportSettings);
router.get('/settings/report/logs', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.getReportLogs);
router.post('/reports/daily', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.sendManualDailyReport);
router.post('/:id/reports/individual', needsAuth, checkModuleEnabled('checklists'), checkPermission('checklists:manage'), ChecklistController.sendManualIndividualReport);

// Execução
router.post('/submit', 
  submitLimiter,
  validate(checklistSubmitSchema),
  ChecklistController.submitExecution
);

// Alias para compatibilidade com frontend
router.post('/execute', 
  submitLimiter,
  validate(checklistSubmitSchema),
  ChecklistController.submitExecution
);

router.post('/upload', upload.single('file'), ChecklistController.uploadFile);

module.exports = router;
