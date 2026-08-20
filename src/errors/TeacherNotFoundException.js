const AppError = require('./AppError');

class TeacherNotFoundException extends AppError {
  constructor(teacherId) {
    super(`Teacher not found with id: ${teacherId}`, 404);
  }
}

module.exports = TeacherNotFoundException;
