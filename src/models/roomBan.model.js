const { Schema, model } = require('mongoose');

// A teacher-issued ban keeping one nickname AND one IP out of one room
// until a set time. Both are checked at join time (see
// roomBan.repository.js#findActiveBan, participant.service.js#joinRoom) -
// nickname alone was trivially bypassed by just picking a new one; IP closes
// most of that gap for a student who doesn't also switch networks.
// Still not a hard guarantee: shared/school WiFi or NAT can put multiple
// students behind the same IP (banning one could, in principle, catch a
// classmate on the same network), and a VPN/mobile-data switch bypasses it
// entirely - there's no stronger identity available without accounts.
const roomBanSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    // Stored lowercased+trimmed so a ban can't be sidestepped by casing/
    // whitespace alone.
    nickname: {
      type: String,
      required: true,
    },
    // The banned participant's joinIp at the moment they were banned (see
    // participant.model.js#joinIp) - null if it couldn't be determined.
    ip: {
      type: String,
      default: null,
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
// Non-unique - the IP half of the lookup in findActiveBan below.
roomBanSchema.index({ room: 1, ip: 1 });

module.exports = model('RoomBan', roomBanSchema);
