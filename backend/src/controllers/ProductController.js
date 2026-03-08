const ProductService = require('../services/ProductService');
const AppError = require('../utils/AppError');

class ProductController {
  // GET /api/products
  getAll = async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const products = await ProductService.getAllProducts(restaurantId, req.query, false);
      res.json(products);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/products/:id
  getOne = async (req, res, next) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const product = await ProductService.getProductById(id, restaurantId, false);
      res.json(product);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const product = await ProductService.createProduct(req.body, restaurantId);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const product = await ProductService.updateProduct(id, req.body, restaurantId);
      res.json(product);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      await ProductService.deleteProduct(id, restaurantId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  getPricingAnalysis = async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const analysis = await ProductService.getPricingAnalysis(restaurantId);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  };

  reorderProducts = async (req, res, next) => {
    try {
      const restaurantId = req.restaurantId || (req.user && req.user.restaurantId);
      const { products } = req.body;
      await ProductService.reorderProducts(products, restaurantId);
      res.status(200).json({ status: 'success', message: 'Products reordered successfully' });
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No image uploaded', 400);
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      next(error);
    }
  };

  // ROTA PÚBLICA (Cardápio Digital) - Aplica DTO de segurança
  getClientProducts = async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const products = await ProductService.getAllProducts(restaurantId, req.query, true);
      res.json(products);
    } catch (error) {
      next(error);
    }
  };

  // Aliases para compatibilidade
  getProducts = this.getAll;
  getProductById = this.getOne;
  createProduct = this.create;
  updateProduct = this.update;
  deleteProduct = this.delete;
}

module.exports = new ProductController();
