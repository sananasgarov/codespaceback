const { Schema, model } = require('mongoose');

// A teacher-issued ban keeping one nickname out of one room until a set
// time. Nickname-scoped rather than participant-scoped on purpose:
// participants are deleted on kick/ban (see participant.service.js), and
// there's no student account to key a longer-lived record off of - nickname
// is the same identity boundary joinRoom already enforces uniqueness on.
const roomBanSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    // Stored lowercased+trimmed so a ban can't be sidestepped by casing/
    // whitespace alone; still trivially bypassed by picking a new nickname
    // outright - there's no stronger identity available without accounts.
    nickname: {
      type: String,
      required: true,
    },
    bannedUntil: {
      type: Date,
      required: true,
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
  },
  {
    collection: 'room_bans',
    timestamps: true,
  }
);

// One active ban record per (room, nickname) - a re-ban just refreshes
// bannedUntil on the existing row instead of piling up duplicates.
roomBanSchema.index({ room: 1, nickname: 1 }, { unique: true });

module.exports = model('RoomBan', roomBanSchema);
