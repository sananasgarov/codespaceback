const participantRepository = require('../../repositories/participant.repository');
const participantService = require('../../services/participant.service');
const messagingTemplate = require('../messagingTemplate');
const {
  buildStatusPayload,
  buildCodePayload,
  buildEditLockPayload,
  buildEditStreamPayload,
  buildExecutionPayload,
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
}

module.exports = { registerCodeStreamHandlers };
