const { z } = require('zod');

// Same limits as room.validator.js#taskRequestSchema (a template is copied
// straight into a room's active task, so the shape has to match).
const taskTemplateRequestSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title must be between 1 and 200 characters')
    .max(200, 'Title must be between 1 and 200 characters'),
  description: z.string().trim().max(5000, 'Description is too long').optional(),
});

module.exports = { taskTemplateRequestSchema };
