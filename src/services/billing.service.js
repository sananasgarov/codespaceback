const teacherRepository = require('../repositories/teacher.repository');
const TeacherNotFoundException = require('../errors/TeacherNotFoundException');
const ValidationError = require('../errors/ValidationError');
const { isValidObjectId } = require('../utils/objectId');
const env = require('../config/env');
const logger = require('../utils/logger');

// Single source of truth for "can this teacher create a room right now?" -
// used both by the requireActiveAccess gate (middleware/access.js) and by
// /billing/status so the frontend can show the same thing pre-emptively.
function getAccessStatus(teacher) {
  const now = new Date();
  const inTrial = Boolean(teacher.trialEndsAt) && now < teacher.trialEndsAt;
  const subscriptionActive =
    Boolean(teacher.subscription?.active) &&
    (!teacher.subscription.currentPeriodEnd || teacher.subscription.currentPeriodEnd > now);

  return {
    hasAccess: inTrial || subscriptionActive,
    inTrial,
    trialEndsAt: teacher.trialEndsAt,
    subscriptionActive,
    subscriptionEndsAt: teacher.subscription?.currentPeriodEnd || null,
  };
}

// Placeholder pricing only - no payment gateway is wired up (see
// PaymentNotAvailableException / billing.controller#subscribe). Values are
// demo defaults set via env until a real price is decided.
function getPlan() {
  return {
    currency: env.billing.currency,
    price: Math.round(env.billing.priceMinor) / 100,
    periodDays: env.billing.periodDays,
    trialDays: env.trialDays,
    paymentsEnabled: false,
    note: 'Payments are not active yet - this is a placeholder price for demo purposes.',
  };
}

// Manually activates/extends a teacher's subscription. This is the only way
// a teacher becomes "paid" right now, since /billing/subscribe is disabled -
// it exists for an admin to flip on access (e.g. after being paid outside
// the app) while a real gateway isn't integrated. Guarded by requireAdminKey.
async function grantSubscription(teacherId, periodDays) {
  if (!isValidObjectId(teacherId)) {
    throw new ValidationError({ teacherId: 'Invalid teacher id' });
  }

  const teacher = await teacherRepository.findById(teacherId);
  if (!teacher) {
    throw new TeacherNotFoundException(teacherId);
  }

  const days = Number.isFinite(periodDays) && periodDays > 0 ? periodDays : env.billing.periodDays;
  const now = new Date();
  const alreadyActive = teacher.subscription.active
    && teacher.subscription.currentPeriodEnd
    && teacher.subscription.currentPeriodEnd > now;
  // Extend from the current period end if still active, otherwise start fresh from now.
  const base = alreadyActive ? teacher.subscription.currentPeriodEnd : now;

  teacher.subscription.active = true;
  teacher.subscription.activatedAt = teacher.subscription.activatedAt || now;
  teacher.subscription.currentPeriodEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await teacherRepository.save(teacher);
  logger.warn(`Admin granted subscription to teacher ${teacher.email} until ${teacher.subscription.currentPeriodEnd.toISOString()}`);

  return teacher;
}

module.exports = { getAccessStatus, getPlan, grantSubscription };
