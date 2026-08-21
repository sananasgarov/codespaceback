function toResponse(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    participantId: String(entry.participantId),
    nickname: entry.nickname,
    type: entry.type,
    at: entry.at,
  };
}

function toResponseList(entries) {
  return entries.map(toResponse);
}

module.exports = { toResponse, toResponseList };
