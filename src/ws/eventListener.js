const participantRepository = require('../repositories/participant.repository');
const messagingTemplate = require('./messagingTemplate');
const { buildStatusPayload } = require('./payloads');
const logger = require('../utils/logger');

// Equivalent of config/WebSocketEventListener.java
function registerEventListeners(stompServer) {
  stompServer.onConnect((sessionId) => {
    logger.info(`WebSocket connected: sessionId=${sessionId}`);
  });

  stompServer.onDisconnect(async (sessionId) => {
    logger.info(`WebSocket disconnected: sessionId=${sessionId}`);

    const participant = await participantRepository.findBySessionId(sessionId);
    if (!participant) {
      logger.warn(`Disconnect: No participant found for sessionId=${sessionId}`);
      return;
    }

    const roomCode = participant.room ? participant.room.roomCode : undefined;
    const nickname = participant.nickname;

    participant.sessionId = null;
    await participantRepository.save(participant);

    logger.info(`Participant '${nickname}' disconnected from room '${roomCode}'`);

    messagingTemplate.convertAndSend(
      `/topic/room/${roomCode}/participants`,
      buildStatusPayload(participant.id, nickname, false)
    );
  });
}

module.exports = { registerEventListeners };
