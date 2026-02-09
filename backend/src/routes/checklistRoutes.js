const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { needsAuth } = require('../middlewares/auth');

router.get('/', needsAuth, ChecklistController.index);
router.get('/history', needsAuth, ChecklistController.executions);
router.get('/:id', needsAuth, ChecklistController.show);
router.post('/', needsAuth, ChecklistController.store);
router.put('/:id', needsAuth, ChecklistController.update);
router.delete('/:id', needsAuth, ChecklistController.delete);

// Execução
router.post('/execute', needsAuth, ChecklistController.submitExecution);

module.exports = router;
