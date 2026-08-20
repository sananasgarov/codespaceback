const { Router } = require('express');
const taskTemplateController = require('../controllers/taskTemplate.controller');
const { validateBody } = require('../middleware/validate');
const { taskTemplateRequestSchema } = require('../validators/taskTemplate.validator');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// A teacher's reusable task bank - independent of any one room, so it's its
// own top-level resource rather than nested under /rooms.
const router = Router();

/**
 * @openapi
 * /api/v1/task-templates:
 *   get:
 *     tags: [TaskTemplates]
 *     summary: List the current teacher's saved task templates
 */
router.get('/', requireAuth, asyncHandler(taskTemplateController.list));

/**
 * @openapi
 * /api/v1/task-templates:
 *   post:
 *     tags: [TaskTemplates]
 *     summary: Save a new task template
 */
router.post(
  '/',
  requireAuth,
  validateBody(taskTemplateRequestSchema),
  asyncHandler(taskTemplateController.create)
);

/**
 * @openapi
 * /api/v1/task-templates/{templateId}:
 *   delete:
 *     tags: [TaskTemplates]
 *     summary: Delete a saved task template. Teacher must own it.
 */
router.delete('/:templateId', requireAuth, asyncHandler(taskTemplateController.remove));

module.exports = router;
