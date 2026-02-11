const logger = require('../config/logger');
const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro Interno do Servidor';
  let details = undefined;

  // Erros do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint failed
        statusCode = 400;
        const target = err.meta?.target || [];
        message = `Já existe um registro com este(a) ${target.join(', ')}.`;
        break;
      case 'P2003': // Foreign key constraint failed
        statusCode = 400;
        message = 'Não é possível excluir ou alterar este registro pois ele está sendo usado em outro lugar.';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = 'O registro solicitado não foi encontrado.';
        break;
      default:
        statusCode = 400;
        message = 'Erro de banco de dados.';
        break;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Dados inválidos enviados para o banco de dados.';
  }
  // Tratamento especial para erros de validação do Zod
  else if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    message = 'Erro de validação nos dados enviados.';
    
    const errors = err.errors || (typeof err.message === 'string' ? JSON.parse(err.message) : []);
    
    details = Array.isArray(errors) ? errors.map(e => ({
      field: e.path?.join('.') || 'unknown',
      message: e.message
    })) : [];
  }
  
  // Log do erro
  if (logger && logger.error) {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - IP: ${req.ip}`);
    if (statusCode === 500) logger.error(err.stack);
  } else {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;