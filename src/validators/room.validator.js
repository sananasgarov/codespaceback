const { z } = require('zod');
const Language = require('../enums/language');

// Equivalent of dto/request/RoomRequest.java
const roomRequestSchema = z.object({
  language: z.nativeEnum(Language, {
    errorMap: () => ({ message: 'Programming language is required' }),
  }),
});

module.exports = { roomRequestSchema };
