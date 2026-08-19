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

async function existsByRoomCodeAndRole(roomCode, role) {
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) return false;
  const count = await Participant.countDocuments({ role, room: room._id });
  return count > 0;
}

function findBySessionId(sessionId) {
  return Participant.findOne({ sessionId }).populate('room', 'roomCode');
}

function findById(id) {
  if (!isValidObjectId(id)) return null;
  return Participant.findById(id);
}

function save(participant) {
  return participant.save();
}

function create(data) {
  return Participant.create(data);
}

module.exports = {
  findAllByRoomCode,
  findByNicknameAndRoomCode,
  existsByRoomCodeAndRole,
  findBySessionId,
  findById,
  save,
  create,
};
