const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Same fail-fast philosophy as config/db.js's MONGODB_URI check: refuse to
// boot with a missing/empty signing secret instead of silently issuing
// tokens that would be trivial to forge.
if (!env.jwt.secret || env.jwt.secret.length < 16) {
  throw new Error(
    'JWT_SECRET is not set (or is too short). Set a long random value in codespaceback/.env - e.g. `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"`'
  );
}

function signToken(teacher) {
  return jwt.sign(
    { sub: String(teacher._id), email: teacher.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, algorithm: 'HS256' }
  );
}

function verifyToken(token) {
  // Pin the algorithm explicitly so a forged token can't switch to `none`
  // or another alg the server didn't intend to trust.
  return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
