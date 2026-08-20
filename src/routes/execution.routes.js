const { Router } = require('express');
const executionController = require('../controllers/execution.controller');
const { validateBody } = require('../middleware/validate');
const { executionRequestSchema, teacherExecutionRequestSchema } = require('../validators/execution.validator');
const { executionLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of controller/ExecutionController.java (@RequestMapping("/api/v1/executions"))
const router = Router();

/**
 * @openapi
 * /api/v1/executions/run:
 *   post:
 *     tags: [Executions]
 *     summary: Compile and run code via the Wandbox API, sandboxed on their end (no local Docker involved)
 */
router.post(
  '/run',
  executionLimiter,
  validateBody(executionRequestSchema),
  asyncHandler(executionController.runCode)
);

/**
 * @openapi
 * /api/v1/executions/run-teacher:
 *   post:
 *     tags: [Executions]
 *     summary: Compile and run the teacher's own "class" editor code. Owner-only, not persisted to execution history.
 */
router.post(
  '/run-teacher',
  requireAuth,
  executionLimiter,
  validateBody(teacherExecutionRequestSchema),
  asyncHandler(executionController.runTeacherCode)
);

/**
 * @openapi
 * /api/v1/executions/history/room/{roomCode}:
 *   get:
 *     tags: [Executions]
 *     summary: Get execution history for a room
 */
router.get('/history/room/:roomCode', asyncHandler(executionController.getRoomHistory));

/**
 * @openapi
 * /api/v1/executions/history/participant/{participantId}:
 *   get:
 *     tags: [Executions]
 *     summary: Get execution history for a participant within a room
 *     parameters:
 *       - in: query
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/history/participant/:participantId', asyncHandler(executionController.getParticipantHistory));

module.exports = router;
