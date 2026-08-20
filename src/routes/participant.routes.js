const { Router } = require('express');
const participantController = require('../controllers/participant.controller');
const { validateBody } = require('../middleware/validate');
const { participantRequestSchema } = require('../validators/participant.validator');
const { joinLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/ParticipantController.java (@RequestMapping("/api/v1/participants"))
const router = Router();

/**
 * @openapi
 * /api/v1/participants/join:
 *   post:
 *     tags: [Participants]
 *     summary: Join a room
 */
router.post(
  '/join',
  joinLimiter,
  validateBody(participantRequestSchema),
  asyncHandler(participantController.joinRoom)
);

/**
 * @openapi
 * /api/v1/participants/room/{roomCode}:
 *   get:
 *     tags: [Participants]
 *     summary: List participants of a room
 */
router.get('/room/:roomCode', asyncHandler(participantController.getRoomParticipants));

module.exports = router;
