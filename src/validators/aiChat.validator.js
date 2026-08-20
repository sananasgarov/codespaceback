const { z } = require('zod');

const objectIdSchema = z
  .string({ required_error: 'Participant ID is required' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Participant ID must be a valid id');

// One prior turn of the conversation, sent back by the frontend so the
// assistant has context across messages - the backend itself keeps no chat
// history (nothing is persisted, see aiChat.service.js).
const chatTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().trim().min(1).max(2000),
});

const aiChatRequestSchema = z.object({
  participantId: objectIdSchema,
  roomCode: z
    .string({ required_error: 'Room code is required' })
    .trim()
    .min(1, 'Room code is required'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be at most 1000 characters'),
  // Capped well below what a real conversation needs - keeps the token bill
  // (and the request payload) bounded regardless of what the client sends.
  history: z.array(chatTurnSchema).max(20).optional(),
});

module.exports = { aiChatRequestSchema };
