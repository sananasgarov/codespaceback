// Equivalent of mapper/RoomMapper.java (MapStruct)
function toResponse(room) {
  if (!room) return null;
  return {
    roomCode: room.roomCode,
    language: room.language,
    status: room.status,
    createdAt: room.createdAt,
  };
}

module.exports = { toResponse };
