const AppError = require('./AppError');

class ParticipantNotFoundException extends AppError {
  constructor(id) {
    super(`Participant not found with id: ${id}`, 404);
  }
}

module.exports = ParticipantNotFoundException;
