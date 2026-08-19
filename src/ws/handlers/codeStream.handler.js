const participantRepository = require('../../repositories/participant.repository');
const participantService = require('../../services/participant.service');
const messagingTemplate = require('../messagingTemplate');
const { buildStatusPayload, buildCodePayload, buildEditLockPayload, buildExecutionPayload } = require('../payloads');
const logger = require('../../utils/logger');

// Equivalent of controller/CodeStreamController.java (@MessageMapping handlers)
function registerCodeStreamHandlers(stompServer) {
  // @MessageMapping("/stream/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/stream/:roomCode/:participantId', async ({ params, body, sessionId }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const codeContent = body;

    const participant = await participantRepository.findById(participantId);
    if (participant) {
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
    if (!participant) {
      logger.warn(`Watch request: participant not found, id=${participantId}`);
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

    await participantService.updateParticipantCode(participantId, editedCode);

    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildCodePayload(participantId, '', editedCode));

    logger.info(`Teacher edited code for participantId=${participantId} in room=${roomCode}`);
  });

  // /app/edit-lock/{roomCode}/{participantId} - not part of the original Java
  // contract. Sent the instant a teacher opens or cancels edit mode, so the
  // student's editor can lock/unlock before any code has actually changed
  // (the /app/edit handler above only fires once, on save).
  stompServer.onAppDestination('/app/edit-lock/:roomCode/:participantId', ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const locked = body === 'true';

    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildEditLockPayload(participantId, locked));

    logger.info(`Teacher ${locked ? 'locked' : 'unlocked'} editor for participantId=${participantId} in room=${roomCode}`);
  });

  // @MessageMapping("/execution/{roomCode}/{participantId}")
  stompServer.onAppDestination('/app/execution/:roomCode/:participantId', ({ params, body }) => {
    const roomCode = params.roomCode;
    const participantId = params.participantId;
    const executionResult = body;

    const destination = `/topic/room/${roomCode}/executions`;
    messagingTemplate.convertAndSend(destination, buildExecutionPayload(participantId, executionResult));

    logger.info(`Execution result broadcast: room=${roomCode}, participantId=${participantId}`);
  });
}

module.exports = { registerCodeStreamHandlers };
