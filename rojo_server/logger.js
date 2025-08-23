// logger.js
const pino = require('pino');

// Create a logger instance.
// In production, you might want to configure transports to send logs
// to a file or a log management service like Datadog or Logtail.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

module.exports = logger;
