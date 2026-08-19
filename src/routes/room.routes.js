const { Router } = require('express');
const roomController = require('../controllers/room.controller');
const { validateBody } = require('../middleware/validate');
const { roomRequestSchema } = require('../validators/room.validator');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/RoomController.java (@RequestMapping("/api/v1/rooms"))
const router = Router();

/**
 * @openapi
 * /api/v1/rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Create a new room
 */
router.post('/', validateBody(roomRequestSchema), asyncHandler(roomController.createRoom));

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
 * /api/v1/rooms/cleanup:
 *   patch:
 *     tags: [Rooms]
 *     summary: Deactivate all empty active rooms
 */
router.patch('/cleanup', asyncHandler(roomController.cleanupEmptyRooms));

/**
 * @openapi
 * /api/v1/rooms/{roomCode}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get a room by its code
 *   delete:
 *     tags: [Rooms]
 *     summary: Deactivate a room by its code
 */
router.get('/:roomCode', asyncHandler(roomController.getRoom));
router.delete('/:roomCode', asyncHandler(roomController.deactivateRoom));

module.exports = router;
