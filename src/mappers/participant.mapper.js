// Equivalent of mapper/ParticipantMapper.java (MapStruct)
function toResponse(participant, roomCodeOverride) {
  if (!participant) return null;
  const roomCode = roomCodeOverride || (participant.room && participant.room.roomCode);
  return {
    id: participant.id,
    nickname: participant.nickname,
    role: participant.role,
    roomCode,
    editingEnabled: participant.editingEnabled !== false,
  };
}

function toResponseList(participants) {
  return participants.map((p) => toResponse(p));
}

module.exports = { toResponse, toResponseList };
