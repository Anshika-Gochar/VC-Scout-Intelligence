/**
 * logger.js — Simple timestamped console logger
 * Levels: info | warn | error | debug
 * Usage: import logger from '../utils/logger.js'
 *        logger.info('Server started')
 *        logger.error('DB connection failed', err)
 */

const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (msg, ...args) => {
    console.log(`[${getTimestamp()}] INFO  ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[${getTimestamp()}] WARN  ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[${getTimestamp()}] ERROR ${msg}`, ...args);
  },
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[${getTimestamp()}] DEBUG ${msg}`, ...args);
    }
  },
};

export default logger;
