const AppError = require('./AppError');

class TaskTemplateNotFoundException extends AppError {
  constructor(id) {
    super(`Task template not found with id: ${id}`, 404);
  }
}

module.exports = TaskTemplateNotFoundException;
