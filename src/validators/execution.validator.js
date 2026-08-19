const { z } = require('zod');

const objectIdSchema = z
  .string({ required_error: 'Participant ID is required' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Participant ID must be a valid id');

// Equivalent of dto/request/ExecutionRequest.java
const executionRequestSchema = z.object({
  participantId: objectIdSchema,
  roomCode: z
    .string({ required_error: 'Room code is required' })
    .trim()
    .min(1, 'Room code is required'),
  code: z
    .string({ required_error: 'Code cannot be empty' })
    .min(1, 'Code cannot be empty'),
});

module.exports = { executionRequestSchema };
