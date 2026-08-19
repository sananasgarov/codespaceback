const AppError = require('./AppError');

class RoomNotFoundException extends AppError {
  constructor(roomCode) {
    super(`Room not found with code: ${roomCode}`, 404);
  }
}

module.exports = RoomNotFoundException;
