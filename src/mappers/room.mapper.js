// Equivalent of mapper/RoomMapper.java (MapStruct)
function toResponse(room) {
  if (!room) return null;
  return {
    roomCode: room.roomCode,
    language: room.language,
    status: room.status,
    createdAt: room.createdAt,
    // Classroom broadcast state - included here (not just pushed over WS) so
    // a page load / reconnect is correct immediately, before the next live
    // event arrives. pinnedParticipant is returned as a plain id string, not
    // populated - the frontend already has the participant list separately.
    teacherCode: room.teacherCode || '',
    teacherEditorPaused: Boolean(room.teacherEditorPaused),
    pinnedParticipantId: room.pinnedParticipant ? String(room.pinnedParticipant) : null,
    currentTask: room.currentTask
      ? {
          title: room.currentTask.title,
          description: room.currentTask.description || '',
          assignedAt: room.currentTask.assignedAt,
        }
      : null,
  };
}

function toResponseList(rooms) {
  return rooms.map((room) => toResponse(room));
}

module.exports = { toResponse, toResponseList };
