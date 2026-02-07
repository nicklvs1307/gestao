const logger = require('../config/logger');
const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro Interno do Servidor';

  // Tratamento especial para erros de validação do Zod
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Erro de validação nos dados enviados.';
    const validationErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: validationErrors
    });
  }
  
  // Log do erro (usando logger existente se disponível, senão console)
  if (logger && logger.error) {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`);
    if (statusCode === 500) logger.error(err.stack);
  } else {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;