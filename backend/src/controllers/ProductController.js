const ProductService = require('../services/ProductService');
const AppError = require('../utils/AppError');

class ProductController {
  constructor(service) {
    this.service = service;
    
    // Bind explicito para Express
    this.getAll = this.getAll.bind(this);
    this.getOne = this.getOne.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.getPricingAnalysis = this.getPricingAnalysis.bind(this);
    this.reorderProducts = this.reorderProducts.bind(this);
    this.uploadImage = this.uploadImage.bind(this);
    this.getClientProducts = this.getClientProducts.bind(this);

    // Aliases (vão herdar o bind porque chamam as funções já bindadas)
    this.getProducts = this.getAll;
    this.getProductById = this.getOne;
    this.createProduct = this.create;
    this.updateProduct = this.update;
    this.deleteProduct = this.delete;
  }

  // MÉTODOS ORIGINAIS REFATORADOS
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
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // MÉTODOS ADICIONAIS NECESSÁRIOS
  async getPricingAnalysis(req, res, next) {
    try {
      const { restaurantId } = req.user;
      const analysis = await this.service.getPricingAnalysis(restaurantId);
      res.status(200).json({ status: 'success', data: analysis });
    } catch (error) {
      next(error);
    }
  }

  async reorderProducts(req, res, next) {
    try {
      const { restaurantId } = req.user;
      const { products } = req.body;
      await this.service.reorderProducts(products, restaurantId);
      res.status(200).json({ status: 'success', message: 'Products reordered successfully' });
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No image uploaded', 400);
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.status(200).json({ status: 'success', data: { imageUrl } });
    } catch (error) {
      next(error);
    }
  }

  async getClientProducts(req, res, next) {
    try {
      const { restaurantId } = req.params;
      const products = await this.service.getAllProducts(restaurantId, req.query);
      res.status(200).json({ status: 'success', data: { products } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController(ProductService);
