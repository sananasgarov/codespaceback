const { Participant } = require('../models');
const roomRepository = require('./room.repository');
const { isValidObjectId } = require('../utils/objectId');

// Equivalent of repository/ParticipantRepository.java
// Room lookups go through roomRepository first since MongoDB has no
// cross-collection JOIN - this mirrors the `room_RoomCode` derived queries
// in the JPA repository.

async function findAllByRoomCode(roomCode) {
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) return [];
  return Participant.find({ room: room._id }).sort({ _id: 1 }).populate('room', 'roomCode');
}

async function findByNicknameAndRoomCode(nickname, roomCode) {
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) return null;
  return Participant.findOne({ nickname, room: room._id });
}

function findBySessionId(sessionId) {
  return Participant.findOne({ sessionId }).populate('room', 'roomCode');
}

// room is populated (just roomCode, not the whole document) so callers can
// cheaply verify a participant actually belongs to the roomCode a request
// claims, without a second query - see execution.service.js and
// ws/handlers/codeStream.handler.js, both of which use this to reject a
// participantId/roomCode pairing that doesn't match (cross-room spoofing).
function findById(id) {
  if (!isValidObjectId(id)) return null;
  return Participant.findById(id).populate('room', 'roomCode');
}

function save(participant) {
  return participant.save();
}

function create(data) {
  return Participant.create(data);
}

function deleteById(id) {
  if (!isValidObjectId(id)) return null;
  return Participant.findByIdAndDelete(id);
}

module.exports = {
  findAllByRoomCode,
  findByNicknameAndRoomCode,
  findBySessionId,
  findById,
  save,
  create,
  deleteById,
};
