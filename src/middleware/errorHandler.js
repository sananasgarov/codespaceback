const logger = require('../utils/logger');
const AppError = require('../errors/AppError');
const ValidationError = require('../errors/ValidationError');
const { apiResponse } = require('../dto/response/apiResponse');

// Equivalent of exception/GlobalExceptionHandler.java (@RestControllerAdvice)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    logger.warn('Validation failed:', err.errors);
    return res.status(err.statusCode).json(
      apiResponse({ success: false, message: err.message, data: err.errors })
    );
  }

  if (err instanceof AppError) {
    logger.warn(`${err.name}: ${err.message}`);
    return res.status(err.statusCode).json(
      apiResponse({ success: false, message: err.message })
    );
  }

  logger.error('Unexpected error:', err);
  return res.status(500).json(
    apiResponse({ success: false, message: 'An unexpected error occurred' })
  );
}

module.exports = errorHandler;
