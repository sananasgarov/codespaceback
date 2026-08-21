const participantRepository = require('../../repositories/participant.repository');
const roomActivityLogRepository = require('../../repositories/roomActivityLog.repository');
const participantService = require('../../services/participant.service');
const roomService = require('../../services/room.service');
const messagingTemplate = require('../messagingTemplate');
const {
  buildStatusPayload,
  buildCodePayload,
  buildEditLockPayload,
  buildEditStreamPayload,
  buildExecutionPayload,
  buildTabVisibilityPayload,
} = require('../payloads');
const logger = require('../../utils/logger');

// The STOMP/SockJS layer has no per-connection auth at all (any client can
// connect and SEND to any destination) - this at least stops the cheapest
// spoof: claiming a roomCode that doesn't match the participantId's real
// room. participantRepository.findById() populates `room` (see
// participant.repository.js) so this is a pure in-memory check, no extra query.
function belongsToRoom(participant, roomCode) {
  return Boolean(participant && participant.room && participant.room.roomCode === roomCode);
}

// Equivalent of controller/CodeStreamController.java (@MessageMapping handlers)
function registerCodeStreamHandlers(stompServer) {
  // @MessageMapping("/stream/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/stream/:roomCode/:participantId', async ({ params, body, sessionId }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const codeContent = body;

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Stream rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    // Server-side enforcement of the teacher's editingEnabled toggle - not
    // just a frontend-only read-only flag, since the WS layer trusts
    // whatever a client sends (see belongsToRoom's comment above).
    if (participant.editingEnabled === false) {
      logger.warn(`Stream rejected: editing is disabled for participant ${participantId}`);
      return;
    }

    participant.currentCode = codeContent;
    await participantRepository.save(participant);

    if (!participant.sessionId || participant.sessionId !== sessionId) {
      participant.sessionId = sessionId;
      await participantRepository.save(participant);
      logger.info(`SessionId set for participant '${participant.nickname}': ${sessionId}`);

      messagingTemplate.convertAndSend(
        `/topic/room/${roomCode}/participants`,
        buildStatusPayload(participantId, participant.nickname, true)
      );
    }

    const destination = `/topic/room/${roomCode}/participant/${participantId}`;
    messagingTemplate.convertAndSend(destination, codeContent);

    logger.debug(`Code stream: room=${roomCode}, participantId=${participantId}, length=${codeContent.length}`);
  });

  // @MessageMapping("/watch/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/watch/:roomCode/:participantId', async ({ params }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Watch rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    const currentCode = participant.currentCode || '';
    messagingTemplate.convertAndSend(
      `/topic/room/${roomCode}/participant/${participantId}`,
      buildCodePayload(participantId, participant.nickname, currentCode)
    );

    logger.info(`Watch request: teacher watching participantId=${participantId} in room=${roomCode}`);
  });

  // @MessageMapping("/edit/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/edit/:roomCode/:participantId', async ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const editedCode = body;

    // updateParticipantCode itself verifies participant.room === roomCode
    // and throws if not - the top-level frame dispatcher (stompServer.js
    // _routeSend) logs and swallows it, so a mismatch just drops the message.
    await participantService.updateParticipantCode(participantId, editedCode, roomCode);

    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildCodePayload(participantId, '', editedCode));

    logger.info(`Teacher edited code for participantId=${participantId} in room=${roomCode}`);
  });

  // /app/edit-stream/{roomCode}/{participantId} - not part of the original
  // Java contract. The teacher's in-progress keystrokes while actively
  // editing (before Save), mirroring /app/stream in the other direction so
  // the student can watch their own code change live instead of only
  // seeing the final result on save. Deliberately does NOT persist
  // currentCode on every keystroke (unlike /app/stream) - only the actual
  // save (/app/edit below) commits anything, this is just a live preview.
  stompServer.onAppDestination('/app/edit-stream/:roomCode/:participantId', async ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const liveCode = body;

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Edit-stream rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildEditStreamPayload(participantId, liveCode));

    logger.debug(`Edit stream: room=${roomCode}, participantId=${participantId}, length=${liveCode.length}`);
  });

  // /app/room-editor-stream/{roomCode} - the teacher's own live code, i.e.
  // what students see by default (see /topic/room/{roomCode}/teacher and
  // room.model.js#teacherCode). Unlike every other handler in this file,
  // this one grants room-wide "broadcast to everyone" power, so it's not
  // enough to just trust a client-supplied roomCode - it requires the
  // caller to have presented a valid teacher JWT on STOMP CONNECT (see
  // stompServer.js's CONNECT handling), and that teacher must own this
  // room. Anonymous connections (every student) always get `teacherId ===
  // undefined` here and are silently rejected by roomService's ownership
  // check via ForbiddenException, which _routeSend just logs and drops.
  stompServer.onAppDestination('/app/room-editor-stream/:roomCode', async ({ params, body, teacherId }) => {
    const roomCode = params.roomCode;
    const code = body;

    try {
      await roomService.streamTeacherCode(roomCode, teacherId, code);
      logger.debug(`Teacher editor stream: room=${roomCode}, length=${code.length}`);
    } catch (err) {
      logger.warn(`Teacher editor stream rejected for room=${roomCode}: ${err.message}`);
    }
  });

  // /app/edit-lock/{roomCode}/{participantId} - not part of the original Java
  // contract. Sent the instant a teacher opens or cancels edit mode, so the
  // student's editor can lock/unlock before any code has actually changed
  // (the /app/edit handler above only fires once, on save).
  stompServer.onAppDestination('/app/edit-lock/:roomCode/:participantId', async ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const locked = body === 'true';

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Edit-lock rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildEditLockPayload(participantId, locked));

    logger.info(`Teacher ${locked ? 'locked' : 'unlocked'} editor for participantId=${participantId} in room=${roomCode}`);
  });

  // @MessageMapping("/execution/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/execution/:roomCode/:participantId', async ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const executionResult = body;

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Execution broadcast rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    const destination = `/topic/room/${roomCode}/executions`;
    messagingTemplate.convertAndSend(destination, buildExecutionPayload(participantId, executionResult));

    logger.info(`Execution result broadcast: room=${roomCode}, participantId=${participantId}`);
  });

  // /app/visibility/{roomCode}/{participantId} - not part of the original
  // Java contract. Driven by the student page's Page Visibility API: fires
  // when they switch to another tab/app while still connected (unlike
  // eventListener.js's onDisconnect, the WS stays open here - backgrounding a
  // tab doesn't close it). Body is the plain string 'true'/'false' (tab now
  // hidden or visible again), mirroring /app/edit-lock's convention.
  stompServer.onAppDestination('/app/visibility/:roomCode/:participantId', async ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const tabHidden = body === 'true';

    const participant = await participantRepository.findById(participantId);
    if (!belongsToRoom(participant, roomCode)) {
      logger.warn(`Visibility change rejected: participant ${participantId} does not belong to room ${roomCode}`);
      return;
    }

    messagingTemplate.convertAndSend(
      `/topic/room/${roomCode}/participants`,
      buildTabVisibilityPayload(participantId, participant.nickname, tabHidden)
    );

    logger.debug(`Tab visibility: room=${roomCode}, participantId=${participantId}, hidden=${tabHidden}`);

    // Feeds the teacher's "Tarixçə" (history) modal - see
    // room.service.js#getRoomActivity. Best-effort, same as the broadcast
    // above: a logging hiccup must never affect the live signal itself.
    try {
      await roomActivityLogRepository.create({
        room: participant.room._id,
        participantId: participant.id,
        nickname: participant.nickname,
        type: tabHidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE',
      });
    } catch (err) {
      logger.error('Failed to write room activity log (tab visibility):', err);
    }
  });
}

module.exports = { registerCodeStreamHandlers };
