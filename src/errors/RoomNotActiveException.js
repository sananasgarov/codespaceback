const AppError = require('./AppError');

class RoomNotActiveException extends AppError {
  constructor(roomCode) {
    super(`Room is no longer active: ${roomCode}`, 403);
  }
}

module.exports = RoomNotActiveException;
