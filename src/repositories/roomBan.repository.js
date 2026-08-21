const { RoomBan } = require('../models');

function normalize(nickname) {
  return String(nickname || '').trim().toLowerCase();
}

// Only returns a ban that's still in effect - an expired row is left in
// place (harmless, and cheap to just ignore) rather than deleted here.
// Matches on nickname OR ip (when ip is given) - either identity being
// banned is enough to block the join; a null/blank ip is never matched
// against a stored ip so this never accidentally blocks everyone.
function findActiveBan(roomId, nickname, ip) {
  const identityMatch = [{ nickname: normalize(nickname) }];
  if (ip) identityMatch.push({ ip });

  return RoomBan.findOne({
    room: roomId,
    bannedUntil: { $gt: new Date() },
    $or: identityMatch,
  });
}

// Upsert: re-banning the same nickname just refreshes bannedUntil (and ip)
// instead of erroring on the unique (room, nickname) index.
function upsertBan(roomId, nickname, ip, bannedUntil, bannedBy) {
  return RoomBan.findOneAndUpdate(
    { room: roomId, nickname: normalize(nickname) },
    { ip: ip || null, bannedUntil, bannedBy },
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
