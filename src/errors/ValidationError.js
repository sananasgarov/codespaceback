const AppError = require('./AppError');

// Equivalent of MethodArgumentNotValidException handling in
// GlobalExceptionHandler.java - carries a field -> message map.
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

module.exports = ValidationError;
