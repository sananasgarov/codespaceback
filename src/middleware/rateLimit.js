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

module.exports = { authLimiter };
