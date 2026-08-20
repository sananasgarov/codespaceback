const AppError = require('./AppError');

// Thrown by the requireActiveAccess gate once a teacher's free trial has
// ended and they have no active subscription. `details` carries the current
// plan/price + trial info so the frontend can render an upgrade prompt.
class PaymentRequiredException extends AppError {
  constructor(details) {
    super('Your free trial has ended. A subscription is required to create new rooms.', 402, details);
  }
}

module.exports = PaymentRequiredException;
