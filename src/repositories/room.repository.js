const { Room, Participant } = require('../models');

// Equivalent of repository/RoomRepository.java

function findByRoomCode(roomCode) {
  return Room.findOne({ roomCode });
}

async function existsByRoomCode(roomCode) {
  const count = await Room.countDocuments({ roomCode });
  return count > 0;
}

// Mirrors: SELECT r FROM Rooms r WHERE r.status = :status AND r.participants IS EMPTY
async function findEmptyRoomsByStatus(status) {
  const roomIdsWithParticipants = await Participant.distinct('room');
  return Room.find({ status, _id: { $nin: roomIdsWithParticipants } });
}

function findByTeacher(teacherId) {
  return Room.find({ teacher: teacherId }).sort({ createdAt: -1 });
}

function save(room) {
  return room.save();
}

function saveAll(rooms) {
  return Promise.all(rooms.map((room) => room.save()));
}

function create(data) {
  return Room.create(data);
}

function deleteById(id) {
  return Room.findByIdAndDelete(id);
}

module.exports = {
  findByRoomCode,
  existsByRoomCode,
  findEmptyRoomsByStatus,
  findByTeacher,
  save,
  saveAll,
  create,
  deleteById,
};
