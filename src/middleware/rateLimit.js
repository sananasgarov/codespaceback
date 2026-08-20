const rateLimit = require('express-rate-limit');

// Auth endpoints are the classic brute-force/credential-stuffing target -
// cap attempts per IP regardless of what the per-account lockout in
// auth.service.js is doing. Deliberately loose (this is a small app, not
// behind a WAF) - tight enough to blunt scripted abuse, loose enough that a
// real user mistyping their password a few times never gets stuck.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', data: null },
});

// POST /executions/run has no auth at all (students never log in) and each
// call pays for a request to a free third-party API (Wandbox - see
// codeRunner.service.js). Without a cap, one IP could keep the execution
// queue permanently full (locks out every other room) or get our server's
// IP rate-limited/banned by Wandbox. 20/min is generous for a real student
// running/testing code, not for a script.
const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many run requests. Please slow down.', data: null },
});

// POST /participants/join is also unauthenticated - loose cap against
// scripted room-flooding/nickname-squatting.
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', data: null },
});

// POST /ai/chat is also unauthenticated (students never log in) and, unlike
// Wandbox, each call is a metered/billed Gemini request - a tighter cap than
// executionLimiter on purpose, since abuse here costs real money, not just
// server capacity.
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chat messages. Please slow down.', data: null },
});

module.exports = { authLimiter, executionLimiter, joinLimiter, aiChatLimiter };
