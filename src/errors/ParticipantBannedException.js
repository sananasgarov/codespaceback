const AppError = require('./AppError');

// `bannedUntil` flows through as the response's `data` field (see
// AppError's third constructor arg) so the frontend can show exactly when
// the student is allowed back instead of just a flat error string.
class ParticipantBannedException extends AppError {
  constructor(bannedUntil) {
    const minutesLeft = Math.max(1, Math.ceil((new Date(bannedUntil) - Date.now()) / 60000));
    super(`You are banned from this room for another ${minutesLeft} minute(s)`, 403, { bannedUntil });
  }
}

module.exports = ParticipantBannedException;
