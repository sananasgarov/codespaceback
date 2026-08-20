const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/AuthController.java (@RequestMapping("/api/v1/auth"))
const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new teacher account (starts a free trial)
 */
router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(authController.register));

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in as a teacher
 */
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(authController.login));

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated teacher's profile and access status
 */
router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
