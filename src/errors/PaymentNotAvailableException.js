const AppError = require('./AppError');

// The real payment gateway is intentionally not wired up yet (per product
// decision - see billing.service.js). Hitting /billing/subscribe returns
// this instead of silently pretending to charge the teacher.
class PaymentNotAvailableException extends AppError {
  constructor(details) {
    super('Online payments are not enabled yet. Please contact the platform admin to activate your subscription.', 503, details);
  }
}

module.exports = PaymentNotAvailableException;
