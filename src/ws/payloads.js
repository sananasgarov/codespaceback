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

// Same /edit topic as buildCodePayload, but a distinct `liveCode` field for
// the teacher's in-progress keystrokes while still editing (not yet saved) -
// mirrors what /app/stream does for the student's own typing. Kept separate
// from `code` so a student client can tell "teacher is previewing" apart
// from "teacher just saved" (buildCodePayload's `code`) without relying on
// message ordering - e.g. show the live text without unlocking the editor
// or firing the "updated" toast, both of which only make sense on save.
function buildEditStreamPayload(participantId, code) {
  return `{"participantId":"${escape(participantId)}","liveCode":"${escape(code || '')}"}`;
}

// /topic/room/{roomCode}/participant/{participantId}/edit - sent the moment a
// teacher opens/closes edit mode, before they've saved anything. The student
// client locks its editor on locked:true and unlocks on locked:false (a
// buildCodePayload message on the same topic, sent when the teacher actually
// saves, also implies unlocked - see codeStream.handler.js).
function buildEditLockPayload(participantId, locked) {
  return `{"participantId":"${escape(participantId)}","locked":${Boolean(locked)}}`;
}

function buildExecutionPayload(participantId, result) {
  return `{"participantId":"${escape(participantId)}","result":"${escape(result || '')}"}`;
}

// /topic/room/{roomCode}/status - room lifecycle events, separate from the
// participant-scoped topics above so both the teacher dashboard and every
// student in the room can subscribe to one shared channel and react (the
// intended use: redirect everyone out to the home page the moment the
// teacher deactivates the room - see room.service.js#deleteRoom).
function buildRoomClosedPayload() {
  return '{"roomClosed":true}';
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
  buildEditLockPayload,
  buildEditStreamPayload,
  buildExecutionPayload,
  buildExecutionResultPayload,
  buildRoomClosedPayload,
};
