const { RoomBan } = require('../models');

function normalize(nickname) {
  return String(nickname || '').trim().toLowerCase();
}

// Only returns a ban that's still in effect - an expired row is left in
// place (harmless, and cheap to just ignore) rather than deleted here.
function findActiveBan(roomId, nickname) {
  return RoomBan.findOne({
    room: roomId,
    nickname: normalize(nickname),
    bannedUntil: { $gt: new Date() },
  });
}

// Upsert: re-banning the same nickname just refreshes bannedUntil instead of
// erroring on the unique (room, nickname) index.
function upsertBan(roomId, nickname, bannedUntil, bannedBy) {
  return RoomBan.findOneAndUpdate(
    { room: roomId, nickname: normalize(nickname) },
    { bannedUntil, bannedBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Used by room.service.js#deleteRoomPermanently - a hard room delete also
// clears any bans issued in it (a re-created room reusing the same code
// down the line shouldn't inherit them).
function deleteAllByRoom(roomId) {
  return RoomBan.deleteMany({ room: roomId });
}

module.exports = { findActiveBan, upsertBan, deleteAllByRoom };
