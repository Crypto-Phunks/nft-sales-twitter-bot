import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file'

export function createLogger(service:string) {
  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))
  ),
    defaultMeta: { service: 'base-service' },
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new DailyRotateFile({
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      }),
      new winston.transports.Console({}),
    ],
  });
}