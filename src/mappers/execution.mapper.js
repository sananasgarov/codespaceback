// Equivalent of mapper/ExecutionMapper.java (MapStruct)
function toResponse(entity, nicknameOverride) {
  if (!entity) return null;
  const nickname = nicknameOverride || (entity.participant && entity.participant.nickname);
  return {
    id: entity.id,
    nickname,
    codeSnapshot: entity.codeSnapshot,
    output: entity.output,
    errorLog: entity.errorLog,
    executedAt: entity.executedAt,
  };
}

function toResponseList(entities) {
  return entities.map((e) => toResponse(e));
}

module.exports = { toResponse, toResponseList };
