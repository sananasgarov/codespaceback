// Base class for all handled application errors, mirroring the RuntimeException
// hierarchy in exception/*.java. GlobalExceptionHandler equivalent is
// middleware/errorHandler.js, which maps these to the right HTTP status.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
