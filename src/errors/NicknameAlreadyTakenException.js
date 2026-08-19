const AppError = require('./AppError');

class NicknameAlreadyTakenException extends AppError {
  constructor(nickname) {
    super(`Nickname already taken in this room: ${nickname}`, 409);
  }
}

module.exports = NicknameAlreadyTakenException;
