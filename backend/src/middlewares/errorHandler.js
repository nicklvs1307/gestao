const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log do erro (usando logger existente se disponível, senão console)
  if (logger && logger.error) {
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`);
    if (statusCode === 500) logger.error(err.stack);
  } else {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Erro Interno do Servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;