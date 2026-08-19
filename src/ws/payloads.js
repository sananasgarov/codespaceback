// Shared JSON payload builders. Consolidates the duplicated private helper
// methods from CodeStreamController.java and ExecutionService.java into one
// place; the escaping logic and JSON shape are kept identical, except
// participantId is now a MongoDB ObjectId string (quoted) instead of a Long.
function escape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function buildStatusPayload(participantId, nickname, online) {
  return `{"participantId":"${escape(participantId)}","nickname":"${escape(nickname)}","online":${online}}`;
}

// Same /topic/room/{roomCode}/participants channel as buildStatusPayload, but
// marked "joined" so the dashboard can add a brand-new row instead of just
// flipping an online flag on a participant it doesn't know about yet.
function buildJoinPayload(participantId, nickname, role) {
  return `{"participantId":"${escape(participantId)}","nickname":"${escape(nickname)}","role":"${escape(role)}","joined":true,"online":false}`;
}

function buildCodePayload(participantId, nickname, code) {
  return `{"participantId":"${escape(participantId)}","nickname":"${escape(nickname)}","code":"${escape(code || '')}"}`;
}

function buildExecutionPayload(participantId, result) {
  return `{"participantId":"${escape(participantId)}","result":"${escape(result || '')}"}`;
}

function buildExecutionResultPayload(participantId, response) {
  const result = response.errorLog != null ? response.errorLog : response.output;
  const success = response.errorLog == null;
  const finalResult = result == null ? '(no output)' : result;

  return (
    `{"participantId":"${escape(participantId)}",` +
    `"nickname":"${escape(response.nickname || '')}",` +
    `"success":${success},` +
    `"result":"${escape(finalResult)}",` +
    `"code":"${escape(response.codeSnapshot || '')}",` +
    `"executedAt":"${response.executedAt ? new Date(response.executedAt).toISOString() : ''}"}`
  );
}

module.exports = {
  buildStatusPayload,
  buildJoinPayload,
  buildCodePayload,
  buildExecutionPayload,
  buildExecutionResultPayload,
};
