const { Router } = require('express');
const participantController = require('../controllers/participant.controller');
const { validateBody } = require('../middleware/validate');
const { participantRequestSchema } = require('../validators/participant.validator');
const { accessRequestSchema } = require('../validators/room.validator');
const { joinLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
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

/**
 * @openapi
 * /api/v1/participants/{participantId}/code:
 *   get:
 *     tags: [Participants]
 *     summary: Get a participant's own last-saved code (so their editor survives a refresh/reconnect)
 *     parameters:
 *       - in: query
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:participantId/code', asyncHandler(participantController.getOwnCode));

/**
 * @openapi
 * /api/v1/participants/{participantId}/access:
 *   patch:
 *     tags: [Participants]
 *     summary: Enable or disable a student's own editor (persisted - survives reconnect). Teacher must own the participant's room.
 */
router.patch(
  '/:participantId/access',
  requireAuth,
  validateBody(accessRequestSchema),
  asyncHandler(participantController.setAccess)
);

/**
 * @openapi
 * /api/v1/participants/{participantId}:
 *   delete:
 *     tags: [Participants]
 *     summary: Kick a student out of the room. Teacher must own the participant's room.
 */
router.delete('/:participantId', requireAuth, asyncHandler(participantController.kickParticipant));

module.exports = router;
