const express = require('express');
const router = express.Router();
const PrintLayoutController = require('../controllers/PrintLayoutController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

// GET - Buscar layout ativo do restaurante
router.get('/', needsAuth, checkPermission('settings:view'), PrintLayoutController.getLayout);

// POST - Criar layout padrão
router.post('/', needsAuth, checkPermission('settings:manage'), PrintLayoutController.createDefaultLayout);

// POST - Migrar configuração do localStorage
router.post('/migrate', needsAuth, checkPermission('settings:manage'), PrintLayoutController.migrateFromLocal);

// PUT - Atualizar configurações globais do layout
router.put('/', needsAuth, checkPermission('settings:manage'), PrintLayoutController.updateGlobalSettings);

// PUT - Atualizar blocos (batch update para drag-and-drop)
router.put('/blocks', needsAuth, checkPermission('settings:manage'), PrintLayoutController.updateBlocks);

// POST - Adicionar bloco customizado
router.post('/blocks', needsAuth, checkPermission('settings:manage'), PrintLayoutController.addCustomBlock);

// DELETE - Remover bloco customizado
router.delete('/blocks/:blockId', needsAuth, checkPermission('settings:manage'), PrintLayoutController.removeBlock);

// GET - Listar tipos de bloco disponíveis
router.get('/block-types', needsAuth, checkPermission('settings:view'), PrintLayoutController.getBlockTypes);

module.exports = router;
