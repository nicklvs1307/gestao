const winston = require('winston');
const path = require('path');

// Define os níveis de severidade (Padrão syslog)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define as cores para cada nível (apenas para o console)
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato para arquivos (JSON estruturado + Timestamp)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Formato para o console (Legível para humanos)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Cria a instância do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    // 1. Arquivo apenas para erros
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    // 2. Arquivo para todos os logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: fileFormat,
    }),
  ],
});

// Se não estivermos em produção, imprime no console também
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
    // Mesmo em produção, é bom ter logs no stdout para o Docker capturar
    logger.add(
        new winston.transports.Console({
            format: winston.format.json(), // JSON no console de produção é melhor para Datadog/CloudWatch
        })
    );
}

// Stream para conectar com o Morgan (HTTP Logger)
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
