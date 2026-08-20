const { Teacher } = require('../models');

// Equivalent of a TeacherRepository - passwordHash/failedLoginAttempts/lockUntil
// are `select: false` on the schema, so callers must opt in explicitly
// (withSecrets) rather than every read accidentally pulling secrets along.

function findByEmail(email, { withSecrets = false } = {}) {
  const query = Teacher.findOne({ email });
  if (withSecrets) query.select('+passwordHash +failedLoginAttempts +lockUntil');
  return query;
}

function findById(id) {
  return Teacher.findById(id);
}

async function existsByEmail(email) {
  const count = await Teacher.countDocuments({ email });
  return count > 0;
}

function create(data) {
  return Teacher.create(data);
}

function save(teacher) {
  return teacher.save();
}

module.exports = {
  findByEmail,
  findById,
  existsByEmail,
  create,
  save,
};
