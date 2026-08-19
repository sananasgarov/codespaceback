const executionLogRepository = require('../repositories/executionLog.repository');
const participantRepository = require('../repositories/participant.repository');
const roomRepository = require('../repositories/room.repository');
const executionMapper = require('../mappers/execution.mapper');
const codeRunner = require('./codeRunner.service');
const messagingTemplate = require('../ws/messagingTemplate');
const { buildExecutionResultPayload } = require('../ws/payloads');
const Language = require('../enums/language');
const ParticipantNotFoundException = require('../errors/ParticipantNotFoundException');
const RoomNotFoundException = require('../errors/RoomNotFoundException');
const logger = require('../utils/logger');

// Equivalent of service/ExecutionService.java

async function executeCode(request) {
  logger.info(`Executing code for participant ${request.participantId} in room ${request.roomCode}`);

  const participant = await participantRepository.findById(request.participantId);
  if (!participant) {
    throw new ParticipantNotFoundException(request.participantId);
  }

  const room = await roomRepository.findByRoomCode(request.roomCode);
  if (!room) {
    throw new RoomNotFoundException(request.roomCode);
  }

  const language = room.language || Language.PYTHON;

  let output = null;
  let errorLog = null;

  const runResult = await codeRunner.runCode(request.code, language);

  if (runResult.startsWith('Error:')) {
    errorLog = runResult;
    logger.warn(`Execution error for participant ${request.participantId}: ${errorLog}`);
  } else {
    output = runResult;
  }

  participant.currentCode = request.code;
  await participantRepository.save(participant);

  const savedLog = await executionLogRepository.create({
    participant: participant._id,
    room: room._id,
    codeSnapshot: request.code,
    output,
    errorLog,
  });

  logger.info(`Execution log saved with id: ${savedLog.id}`);

  // Pass nickname explicitly - savedLog.participant is just an ObjectId here,
  // not a populated document (no re-fetch needed for the response DTO).
  const response = executionMapper.toResponse(savedLog, participant.nickname);

  broadcastExecutionResult(request.roomCode, request.participantId, response);

  return response;
}

async function getRoomHistory(roomCode) {
  logger.info(`Fetching execution history for room: ${roomCode}`);
  const logs = await executionLogRepository.findAllByRoomCodeOrderByExecutedAtDesc(roomCode);
  return executionMapper.toResponseList(logs);
}

async function getParticipantHistory(participantId, roomCode) {
  logger.info(`Fetching history for participant ${participantId} in room ${roomCode}`);
  const logs = await executionLogRepository.findAllByParticipantIdAndRoomCodeOrderByExecutedAtDesc(
    participantId,
    roomCode
  );
  return executionMapper.toResponseList(logs);
}

async function getRecentActivity(roomCode) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = await executionLogRepository.findAllByRoomCodeAndExecutedAtAfter(roomCode, oneHourAgo);
  return executionMapper.toResponseList(logs);
}

function broadcastExecutionResult(roomCode, participantId, response) {
  try {
    const destination = `/topic/room/${roomCode}/executions`;
    messagingTemplate.convertAndSend(destination, buildExecutionResultPayload(participantId, response));
    logger.info(`Execution result broadcast to room=${roomCode}, participantId=${participantId}`);
  } catch (err) {
    logger.error('Failed to broadcast execution result:', err);
  }
}

module.exports = {
  executeCode,
  getRoomHistory,
  getParticipantHistory,
  getRecentActivity,
};
