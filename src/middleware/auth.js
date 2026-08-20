const { verifyToken } = require('../utils/jwt');
const teacherRepository = require('../repositories/teacher.repository');
const UnauthorizedException = require('../errors/UnauthorizedException');
const asyncHandler = require('../utils/asyncHandler');

// Equivalent of the JWT auth filter - verifies the Bearer token, re-loads the
// teacher from the DB (rather than trusting the token payload as-is) so a
// disabled/deleted account is rejected immediately instead of only once the
// token happens to expire, and attaches it as req.teacher.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Authentication required');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  const teacher = await teacherRepository.findById(payload.sub);
  if (!teacher || !teacher.isActive) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  req.teacher = teacher;
  next();
});

module.exports = { requireAuth };
