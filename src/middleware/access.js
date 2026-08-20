const billingService = require('../services/billing.service');
const PaymentRequiredException = require('../errors/PaymentRequiredException');

// Gate for room *creation* only: must run after requireAuth (needs
// req.teacher). Lets the request through while the teacher is inside their
// free trial window or has an active subscription; otherwise blocks with 402
// and the current plan info so the frontend can show an upgrade prompt.
function requireActiveAccess(req, res, next) {
  const status = billingService.getAccessStatus(req.teacher);

  if (!status.hasAccess) {
    throw new PaymentRequiredException({ ...status, plan: billingService.getPlan() });
  }

  req.accessStatus = status;
  next();
}

module.exports = { requireActiveAccess };
