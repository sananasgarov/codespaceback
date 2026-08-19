const { z } = require('zod');

// Equivalent of dto/request/ParticipantRequest.java
const participantRequestSchema = z.object({
  roomCode: z
    .string({ required_error: 'Room code cannot be empty' })
    .trim()
    .min(1, 'Room code cannot be empty')
    .length(6, 'Room code must be 6 digits'),
  nickname: z
    .string({ required_error: 'Nickname cannot be empty' })
    .trim()
    .min(2, 'Nickname must be between 2 and 20 characters')
    .max(20, 'Nickname must be between 2 and 20 characters'),
});

module.exports = { participantRequestSchema };
