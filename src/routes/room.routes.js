const { Router } = require('express');
const roomController = require('../controllers/room.controller');
const { validateBody } = require('../middleware/validate');
const {
  roomRequestSchema,
  pinRequestSchema,
  pauseRequestSchema,
  taskRequestSchema,
} = require('../validators/room.validator');
const { requireAuth } = require('../middleware/auth');
const { requireActiveAccess } = require('../middleware/access');
const { requireAdminKey } = require('../middleware/adminAuth');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/RoomController.java (@RequestMapping("/api/v1/rooms"))
const router = Router();

/**
 * @openapi
 * /api/v1/rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Create a new room (teacher must be logged in and inside their free trial or subscribed)
 */
router.post(
  '/',
  requireAuth,
  requireActiveAccess,
  validateBody(roomRequestSchema),
  asyncHandler(roomController.createRoom)
);

/**
 * @openapi
 * /api/v1/rooms/languages:
 *   get:
 *     tags: [Rooms]
 *     summary: List supported programming languages
 */
router.get('/languages', roomController.getLanguages);

/**
 * @openapi
 * /api/v1/rooms/mine:
 *   get:
 *     tags: [Rooms]
 *     summary: List rooms owned by the authenticated teacher
 */
router.get('/mine', requireAuth, asyncHandler(roomController.getMyRooms));

/**
 * @openapi
 * /api/v1/rooms/cleanup:
 *   patch:
 *     tags: [Rooms]
 *     summary: (Internal) Deactivate all empty active rooms - requires x-admin-key header
 */
router.patch('/cleanup', requireAdminKey, asyncHandler(roomController.cleanupEmptyRooms));

/**
 * @openapi
 * /api/v1/rooms/{roomCode}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get a room by its code (public - used by students before joining)
 *   delete:
 *     tags: [Rooms]
 *     summary: Deactivate a room by its code (only the owning teacher may do this)
 */
router.get('/:roomCode', asyncHandler(roomController.getRoom));
router.delete('/:roomCode', requireAuth, asyncHandler(roomController.deactivateRoom));

/**
 * @openapi
 * /api/v1/rooms/{roomCode}/pin:
 *   patch:
 *     tags: [Rooms]
 *     summary: Pin a participant's editor as the shared view for the room, or unpin (participantId null) to go back to the teacher's own editor
 */
router.patch(
  '/:roomCode/pin',
  requireAuth,
  validateBody(pinRequestSchema),
  asyncHandler(roomController.pinParticipant)
);

/**
 * @openapi
 * /api/v1/rooms/{roomCode}/pause:
 *   patch:
 *     tags: [Rooms]
 *     summary: Pause or resume the teacher's own live editor broadcast
 */
router.patch(
  '/:roomCode/pause',
  requireAuth,
  validateBody(pauseRequestSchema),
  asyncHandler(roomController.setPause)
);

/**
 * @openapi
 * /api/v1/rooms/{roomCode}/task:
 *   patch:
 *     tags: [Rooms]
 *     summary: Assign the room's active coding task, or clear it (title null)
 */
router.patch(
  '/:roomCode/task',
  requireAuth,
  validateBody(taskRequestSchema),
  asyncHandler(roomController.setTask)
);

module.exports = router;
