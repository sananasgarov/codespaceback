const AppError = require('./AppError');

// Generic 409 for state conflicts (e.g. registering an email that's already taken).
class ConflictException extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

module.exports = ConflictException;
