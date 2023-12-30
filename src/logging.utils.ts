import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file'
const { errors  } = format;

export function createLogger(service:string) {
  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      errors({ stack: true }),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `[${info.timestamp}] [${info.service}] [${info.level}]: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))
  ),
    defaultMeta: { service },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      }),
      new winston.transports.Console({}),
    ],
  });
}