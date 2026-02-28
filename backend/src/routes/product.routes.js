const express = require('express');
const { z } = require('zod');
const validate = require('../middlewares/validate');
const productController = require('../controllers/ProductController');
// const authController = require('../controllers/authController'); // Supondo que você tenha Auth

const router = express.Router();

// 1. Definição dos Schemas de Validação (Zod)
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  imageUrl: z.string().url('URL da imagem inválida').optional(),
  isAvailable: z.boolean().default(true),
  showInMenu: z.boolean().default(true),
  categoryId: z.string().uuid('ID de Categoria inválido').optional(), // Legado
  categoryIds: z.array(z.string().uuid()).optional().default([]), // Novo Many-to-Many
  sizes: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
  })).optional().default([]),
  addonGroups: z.array(z.object({
    name: z.string(),
    addons: z.array(z.object({
      name: z.string(),
      price: z.number().nonnegative(),
    })),
  })).optional().default([]),
});

const updateProductSchema = productSchema.partial(); // Permite enviar apenas alguns campos

// 2. Proteção das Rotas (Authentication Middleware)
// router.use(authController.protect); 
// router.use(authController.restrictTo('admin', 'manager'));

// 3. Definição das Rotas
router
  .route('/')
  .get(productController.getAll)
  .post(validate(productSchema), productController.create);

router
  .route('/:id')
  .get(productController.getOne)
  .patch(validate(updateProductSchema), productController.update)
  .delete(productController.delete);

module.exports = router;
