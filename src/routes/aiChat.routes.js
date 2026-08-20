const { Router } = require('express');
const aiChatController = require('../controllers/aiChat.controller');
const { validateBody } = require('../middleware/validate');
const { aiChatRequestSchema } = require('../validators/aiChat.validator');
const { aiChatLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

/**
 * @openapi
 * /api/v1/ai/chat:
 *   post:
 *     tags: [AiChat]
 *     summary: Ask the student-facing AI assistant a question. Concept explanations only - it's instructed (and post-filtered) to never return code.
 */
router.post(
  '/chat',
  aiChatLimiter,
  validateBody(aiChatRequestSchema),
  asyncHandler(aiChatController.chat)
);

module.exports = router;
