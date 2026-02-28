const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Formata os erros do Zod para uma mensagem mais amigável
      const errors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError(`Validation Error: ${JSON.stringify(errors)}`, 400));
    }
    next(error);
  }
};

module.exports = validate;
