const billingService = require('../services/billing.service');
const { apiResponse } = require('../dto/response/apiResponse');
const PaymentNotAvailableException = require('../errors/PaymentNotAvailableException');
const logger = require('../utils/logger');

// Equivalent of controller/BillingController.java

function getPlan(req, res) {
  res.status(200).json(
    apiResponse({ success: true, message: 'Plan fetched successfully', data: billingService.getPlan() })
  );
}

function getStatus(req, res) {
  const data = billingService.getAccessStatus(req.teacher);

  res.status(200).json(
    apiResponse({ success: true, message: 'Access status fetched successfully', data })
  );
}

// Real payment gateway is not connected yet - see PaymentNotAvailableException.
// Kept as a real endpoint (rather than removed) so the frontend has a stable
// place to call once a gateway is wired in later.
async function subscribe(req, res) {
  logger.info(`Subscribe attempt (payments disabled) for teacher: ${req.teacher.email}`);
  throw new PaymentNotAvailableException({ plan: billingService.getPlan() });
}

// Internal/demo-only: lets an admin manually activate a teacher's
// subscription in place of a real checkout flow. Guarded by requireAdminKey.
async function adminGrant(req, res) {
  const { teacherId } = req.params;
  const periodDays = Number(req.body?.periodDays);

  const teacher = await billingService.grantSubscription(teacherId, periodDays);

  res.status(200).json(
    apiResponse({
      success: true,
      message: 'Subscription activated',
      data: billingService.getAccessStatus(teacher),
    })
  );
}

module.exports = { getPlan, getStatus, subscribe, adminGrant };
