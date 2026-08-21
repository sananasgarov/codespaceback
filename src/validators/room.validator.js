const { z } = require('zod');
const Language = require('../enums/language');

// Equivalent of dto/request/RoomRequest.java
// durationMinutes: how long the room stays ACTIVE before it auto-closes
// (see room.service.js#createRoom/applyExpiry) - required, no "unlimited"
// option. Capped at 24h.
const roomRequestSchema = z.object({
  language: z.nativeEnum(Language, {
    errorMap: () => ({ message: 'Programming language is required' }),
  }),
  durationMinutes: z
    .number({ required_error: 'Duration is required', invalid_type_error: 'Duration must be a number of minutes' })
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(1440, 'Duration cannot exceed 24 hours'),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

// participantId: null unpins (back to watching the teacher); a real id pins that student.
const pinRequestSchema = z.object({
  participantId: objectIdSchema.nullable(),
});

const pauseRequestSchema = z.object({
  paused: z.boolean({ required_error: 'paused must be a boolean' }),
});

// title: null clears the active task; otherwise sets a new one (replaces any existing task).
const taskRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title must be between 1 and 200 characters')
    .max(200, 'Title must be between 1 and 200 characters')
    .nullable(),
  description: z.string().trim().max(5000, 'Description is too long').optional(),
});

const accessRequestSchema = z.object({
  editingEnabled: z.boolean({ required_error: 'editingEnabled must be a boolean' }),
});

const aiChatRequestSchema = z.object({
  enabled: z.boolean({ required_error: 'enabled must be a boolean' }),
});

module.exports = {
  roomRequestSchema,
  pinRequestSchema,
  pauseRequestSchema,
  taskRequestSchema,
  accessRequestSchema,
  aiChatRequestSchema,
};
