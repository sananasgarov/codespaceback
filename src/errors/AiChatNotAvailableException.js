const AppError = require('./AppError');

// No GEMINI_API_KEY configured yet - see config/env.js#gemini and
// aiChat.service.js. Kept as a real, well-defined error (not a generic 500)
// so the frontend can show something clearer than "something went wrong".
class AiChatNotAvailableException extends AppError {
  constructor() {
    super('The AI assistant is not enabled on this server yet.', 503);
  }
}

module.exports = AiChatNotAvailableException;
