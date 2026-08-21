const { RoomActivityLog } = require('../models');

function create(data) {
  return RoomActivityLog.create(data);
}

// Newest first, capped - this is a "recent activity" view for a teacher
// modal, not a full audit export.
function findRecentByRoom(roomId, limit = 100) {
  return RoomActivityLog.find({ room: roomId }).sort({ at: -1 }).limit(limit);
}

// Used by room.service.js#deleteRoomPermanently - a hard room delete also
// clears its activity log, same as it does bans/participants/execution logs.
function deleteAllByRoom(roomId) {
  return RoomActivityLog.deleteMany({ room: roomId });
}

module.exports = { create, findRecentByRoom, deleteAllByRoom };
