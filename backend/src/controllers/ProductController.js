const ProductService = require('../services/ProductService');
const AppError = require('../utils/AppError');

class ProductController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const { restaurantId } = req.user; // Obtido do middleware de auth
      const products = await this.service.getAllProducts(restaurantId, req.query);
      
      res.status(200).json({
        status: 'success',
        results: products.length,
        data: { products },
      });
    } catch (error) {
      next(error); // Encaminha para o Global Error Handler
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { restaurantId } = req.user;
      
      const product = await this.service.getProductById(id, restaurantId);

      res.status(200).json({
        status: 'success',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { restaurantId } = req.user;
      const product = await this.service.createProduct(req.body, restaurantId);

      res.status(201).json({
        status: 'success',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { restaurantId } = req.user;
      
      const product = await this.service.updateProduct(id, req.body, restaurantId);

      res.status(200).json({
        status: 'success',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const { restaurantId } = req.user;
      
      await this.service.deleteProduct(id, restaurantId);

      res.status(204).json({
        status: 'success',
        data: null, // Padrão REST: 204 No Content não retorna corpo
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController(ProductService);
