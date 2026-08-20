// Base class for all handled application errors, mirroring the RuntimeException
// hierarchy in exception/*.java. GlobalExceptionHandler equivalent is
// middleware/errorHandler.js, which maps these to the right HTTP status.
class AppError extends Error {
  constructor(message, statusCode = 500, data = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // Optional extra payload (e.g. plan/pricing info alongside a 402) - the
    // error handler forwards this as the response's `data` field when present.
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
