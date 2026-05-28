import { createLogger, format, transports } from 'winston';
import env from '../config/env.js';

const level = env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'valo-app' },
  transports: [
    new transports.Console({ format: format.combine(format.colorize(), format.simple()) })
  ]
});

export default logger;
