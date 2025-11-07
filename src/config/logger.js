/**
 * LOGGER MODULE
 * Simple logging utility for the application
 */

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const logger = {
  // Error logging
  error: (message, error = null) => {
    console.error(`[${new Date().toISOString()}] [${logLevels.ERROR}] ${message}`, error ? error : '');
  },

  // Warning logging
  warn: (message) => {
    console.warn(`[${new Date().toISOString()}] [${logLevels.WARN}] ${message}`);
  },

  // Info logging
  info: (message) => {
    console.log(`[${new Date().toISOString()}] [${logLevels.INFO}] ${message}`);
  },

  // Debug logging
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] [${logLevels.DEBUG}] ${message}`);
    }
  },

  // Success logging
  success: (message) => {
    console.log(`[${new Date().toISOString()}] [SUCCESS] ✅ ${message}`);
  },
};

module.exports = logger;