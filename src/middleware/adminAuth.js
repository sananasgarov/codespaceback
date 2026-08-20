const crypto = require('crypto');
const env = require('../config/env');
const ForbiddenException = require('../errors/ForbiddenException');

// Guards the internal/demo billing endpoints (manually granting a
// subscription while no real payment gateway is wired up). Requires an
// `x-admin-key` header matching ADMIN_KEY. If ADMIN_KEY isn't set, the
// route is locked entirely rather than silently accepting any/no key.
function timingSafeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdminKey(req, res, next) {
  const provided = req.headers['x-admin-key'];

  if (!env.adminKey || !provided || !timingSafeEquals(provided, env.adminKey)) {
    throw new ForbiddenException('Admin access required');
  }

  next();
}

module.exports = { requireAdminKey };
