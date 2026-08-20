const { ExecutionLog } = require('../models');
const roomRepository = require('./room.repository');
const { isValidObjectId } = require('../utils/objectId');

// Equivalent of repository/ExecutionLogRepository.java

async function findAllByRoomCodeOrderByExecutedAtDesc(roomCode) {
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) return [];
  return ExecutionLog.find({ room: room._id })
    .sort({ executedAt: -1 })
    .populate('participant', 'nickname');
}

async function findAllByParticipantIdAndRoomCodeOrderByExecutedAtDesc(participantId, roomCode) {
  if (!isValidObjectId(participantId)) return [];
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) return [];
  return ExecutionLog.find({ participant: participantId, room: room._id })
    .sort({ executedAt: -1 })
    .populate('participant', 'nickname');
}

function create(data) {
  return ExecutionLog.create(data);
}

// Used by room.service.js#deleteRoomPermanently - a hard room delete also
// wipes its run history instead of leaving orphaned logs behind.
function deleteAllByRoom(roomId) {
  return ExecutionLog.deleteMany({ room: roomId });
}

module.exports = {
  findAllByRoomCodeOrderByExecutedAtDesc,
  findAllByParticipantIdAndRoomCodeOrderByExecutedAtDesc,
  create,
  deleteAllByRoom,
};
