const participantRepository = require('../repositories/participant.repository');
const roomActivityLogRepository = require('../repositories/roomActivityLog.repository');
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

    // Feeds the teacher's "Tarixçə" (history) modal - see
    // room.service.js#getRoomActivity. Best-effort, same as the broadcast
    // above: a logging hiccup must never affect the disconnect itself.
    if (participant.room) {
      try {
        await roomActivityLogRepository.create({
          room: participant.room._id,
          participantId: participant.id,
          nickname,
          type: 'LEFT',
        });
      } catch (err) {
        logger.error('Failed to write room activity log (LEFT):', err);
      }
    }
  });
}

module.exports = { registerEventListeners };
