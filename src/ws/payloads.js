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

// Same /topic/room/{roomCode}/participants channel again - fired from the
// student's Page Visibility API (see /app/visibility below), not a real
// connect/disconnect. Lets the teacher tell "closed the tab" (buildStatusPayload,
// online:false) apart from "just tabbed away, still connected".
function buildTabVisibilityPayload(participantId, nickname, tabHidden) {
  return `{"participantId":"${escape(participantId)}","nickname":"${escape(nickname)}","tabHidden":${Boolean(tabHidden)}}`;
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

// Same /status topic as buildRoomClosedPayload. These carry structured
// values (nested object, nullable id) that are awkward to hand-escape like
// the payloads above, so they use JSON.stringify instead - still the same
// wire format, just built more safely for shapes this varied.
function buildPinnedPayload(participantId) {
  return JSON.stringify({ pinnedParticipantId: participantId || null });
}

function buildTeacherPausedPayload(paused) {
  return JSON.stringify({ teacherPaused: Boolean(paused) });
}

function buildTaskPayload(task) {
  return JSON.stringify({ task: task || null });
}

// Same /status topic - lets an already-open student page show/hide the AI
// chat widget live instead of only picking up the setting on next load.
function buildAiChatEnabledPayload(enabled) {
  return JSON.stringify({ aiChatEnabled: Boolean(enabled) });
}

// /topic/room/{roomCode}/teacher - the teacher's own live code, i.e. what
// every student sees by default (unless a student has been pinned - see
// buildPinnedPayload). Suppressed while the room is paused; see
// room.service.js#setTeacherPaused and the /app/room-editor-stream handler.
function buildTeacherCodePayload(code) {
  return JSON.stringify({ code: code || '' });
}

// Same /edit topic as buildCodePayload/buildEditLockPayload - a persisted
// (see participant.model.js) teacher-controlled toggle for whether this
// student may type in their own editor at all, distinct from `locked`
// (which is just "the 1:1 review panel is open right now").
function buildEditingEnabledPayload(participantId, editingEnabled) {
  return JSON.stringify({ participantId, editingEnabled: Boolean(editingEnabled) });
}

// Same /edit topic as buildCodePayload/buildEditLockPayload/
// buildEditingEnabledPayload - sent when the teacher removes this student
// from the room. The student client reacts by routing itself out (see
// student/page.js); there's nothing left to save or unlock at that point.
// `bannedUntil` (ISO string) is only present for a ban (not a plain kick) -
// see participant.service.js#banParticipant - so the student can be told
// exactly when they're allowed back instead of just "you got kicked".
function buildKickedPayload(participantId, bannedUntil) {
  const bannedField = bannedUntil ? `,"bannedUntil":"${escape(bannedUntil)}"` : '';
  return `{"participantId":"${escape(participantId)}","kicked":true${bannedField}}`;
}

// /topic/room/{roomCode}/participants - same channel as buildJoinPayload,
// but marked "removed" so the teacher dashboard can drop the row instead of
// waiting for a stale presence timeout.
function buildParticipantRemovedPayload(participantId) {
  return `{"participantId":"${escape(participantId)}","removed":true}`;
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
  buildPinnedPayload,
  buildTeacherPausedPayload,
  buildTaskPayload,
  buildAiChatEnabledPayload,
  buildTeacherCodePayload,
  buildEditingEnabledPayload,
  buildKickedPayload,
  buildParticipantRemovedPayload,
  buildTabVisibilityPayload,
};
