import morgan from 'morgan';
import logger from '../utils/logger.util.js';

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export const requestLogger = morgan('combined', { stream });
