const express = require('express');
const router = express.Router();
const GlobalSizeController = require('../controllers/GlobalSizeController');
const { needsAuth } = require('../middlewares/auth');

router.use(needsAuth);

router.get('/', GlobalSizeController.getAll);
router.post('/', GlobalSizeController.create);
router.put('/:id', GlobalSizeController.update);
router.delete('/:id', GlobalSizeController.delete);

module.exports = router;
