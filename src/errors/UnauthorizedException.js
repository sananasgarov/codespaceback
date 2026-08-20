const AppError = require('./AppError');

// Missing / invalid / expired credentials (login, JWT). Deliberately generic
// messages are passed in by callers - never confirm/deny whether an email
// exists (see auth.service.js).
class UnauthorizedException extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

module.exports = UnauthorizedException;
