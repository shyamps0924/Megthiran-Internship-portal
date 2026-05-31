const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Something went wrong. Please try again.' : error.message;

  if (process.env.NODE_ENV !== 'test') {
    logger.error('API request failed.', {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message: error.message,
      stack: error.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
