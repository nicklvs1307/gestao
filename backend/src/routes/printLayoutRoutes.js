const express = require('express');
const router = express.Router();
const PrintLayoutController = require('../controllers/PrintLayoutController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

// GET - Buscar layout ativo do restaurante (query: type=delivery|pickup|table)
router.get('/', needsAuth, checkPermission('settings:view'), PrintLayoutController.getLayout);

// GET - Buscar todos os layouts do restaurante
router.get('/all', needsAuth, checkPermission('settings:view'), PrintLayoutController.getAllLayouts);

// GET - Listar tipos de layout disponíveis
router.get('/types', needsAuth, checkPermission('settings:view'), PrintLayoutController.getLayoutTypes);

// GET - Listar tipos de bloco disponíveis
router.get('/block-types', needsAuth, checkPermission('settings:view'), PrintLayoutController.getBlockTypes);

// POST - Criar layout padrão (body: { type, globalSettings })
router.post('/', needsAuth, checkPermission('settings:manage'), PrintLayoutController.createDefaultLayout);

// POST - Criar todos os layouts padrão (delivery, pickup, table)
router.post('/create-all', needsAuth, checkPermission('settings:manage'), PrintLayoutController.createAllDefaultLayouts);

// POST - Migrar configuração do localStorage (body: { type, globalSettings, blocks })
router.post('/migrate', needsAuth, checkPermission('settings:manage'), PrintLayoutController.migrateFromLocal);

// PUT - Atualizar configurações globais do layout (query: type)
router.put('/', needsAuth, checkPermission('settings:manage'), PrintLayoutController.updateGlobalSettings);

// PUT - Atualizar blocos (batch update para drag-and-drop) (query: type)
router.put('/blocks', needsAuth, checkPermission('settings:manage'), PrintLayoutController.updateBlocks);

// POST - Adicionar bloco customizado (query: type)
router.post('/blocks', needsAuth, checkPermission('settings:manage'), PrintLayoutController.addCustomBlock);

// DELETE - Remover bloco customizado (query: type)
router.delete('/blocks/:blockId', needsAuth, checkPermission('settings:manage'), PrintLayoutController.removeBlock);

// DELETE - Deletar configuração de layout por tipo (query: type)
router.delete('/', needsAuth, checkPermission('settings:manage'), PrintLayoutController.deleteLayout);

module.exports = router;
