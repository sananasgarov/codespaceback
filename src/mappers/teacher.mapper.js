// Equivalent of mapper/TeacherMapper.java - never touches passwordHash /
// failedLoginAttempts / lockUntil, all of which are select:false anyway.
function toResponse(teacher) {
  if (!teacher) return null;
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    createdAt: teacher.createdAt,
    isActive: teacher.isActive,
  };
}

module.exports = { toResponse };
