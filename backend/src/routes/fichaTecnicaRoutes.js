const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  duplicate,
  linkProduct,
  linkAddon,
  unlinkProduct,
  unlinkAddon
} = require('../controllers/FichaTecnicaController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// CRUD básico
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Duplicar
router.post('/:id/duplicate', duplicate);

// Vincular/Desvincular produtos
router.put('/:id/link-product/:productId', linkProduct);
router.put('/:id/unlink-product/:productId', unlinkProduct);

// Vincular/Desvincular adicionais
router.put('/:id/link-addon/:addonId', linkAddon);
router.put('/:id/unlink-addon/:addonId', unlinkAddon);

module.exports = router;
