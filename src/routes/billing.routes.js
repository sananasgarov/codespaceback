const { Router } = require('express');
const billingController = require('../controllers/billing.controller');
const { requireAuth } = require('../middleware/auth');
const { requireAdminKey } = require('../middleware/adminAuth');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/BillingController.java (@RequestMapping("/api/v1/billing"))
const router = Router();

/**
 * @openapi
 * /api/v1/billing/plan:
 *   get:
 *     tags: [Billing]
 *     summary: Get the current pricing plan (payments not active yet - placeholder price)
 */
router.get('/plan', billingController.getPlan);

/**
 * @openapi
 * /api/v1/billing/status:
 *   get:
 *     tags: [Billing]
 *     summary: Get the authenticated teacher's trial/subscription status
 */
router.get('/status', requireAuth, billingController.getStatus);

/**
 * @openapi
 * /api/v1/billing/subscribe:
 *   post:
 *     tags: [Billing]
 *     summary: Start a paid subscription (currently disabled - no payment gateway wired up)
 */
router.post('/subscribe', requireAuth, asyncHandler(billingController.subscribe));

/**
 * @openapi
 * /api/v1/billing/admin/teachers/{teacherId}/grant:
 *   post:
 *     tags: [Billing]
 *     summary: (Internal/demo) Manually activate a teacher's subscription - requires x-admin-key header
 */
router.post('/admin/teachers/:teacherId/grant', requireAdminKey, asyncHandler(billingController.adminGrant));

module.exports = router;
