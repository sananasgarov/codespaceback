const AppError = require('./AppError');

// Caller is authenticated but not allowed to perform this action
// (e.g. a teacher trying to deactivate another teacher's room).
class ForbiddenException extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

module.exports = ForbiddenException;
