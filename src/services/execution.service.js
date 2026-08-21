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
const ForbiddenException = require('../errors/ForbiddenException');
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

  // A participant only exists inside the room they joined - reject any
  // request pairing a real participantId with a roomCode it doesn't belong
  // to. Without this, anyone who learns another participant's id could run
  // code "as" them into a different room: overwriting their saved
  // currentCode and broadcasting into that other room's execution feed.
  if (!participant.room || participant.room.roomCode !== request.roomCode) {
    logger.warn(`Execution rejected: participant ${request.participantId} does not belong to room ${request.roomCode}`);
    throw new ParticipantNotFoundException(request.participantId);
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

// Runs code from the teacher's own "class" editor (Sinif redaktoru). Unlike
// executeCode above, there's no Participant behind the teacher's code - it
// lives on the Room document itself (room.teacherCode, streamed over
// /app/room-editor-stream) - so this just executes and returns the result
// without touching participantRepository or executionLogRepository. The
// teacher keeps typing in the same editor afterwards; nothing here clears it.
async function executeTeacherCode({ roomCode, code, teacherId }) {
  logger.info(`Executing teacher's own code in room ${roomCode}`);

  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) {
    throw new RoomNotFoundException(roomCode);
  }
  if (!room.teacher || String(room.teacher) !== String(teacherId)) {
    logger.warn(`Forbidden: teacher ${teacherId} attempted to run code in room ${roomCode} they do not own`);
    throw new ForbiddenException('You can only run code in rooms you created');
  }

  const language = room.language || Language.PYTHON;
  const runResult = await codeRunner.runCode(code, language);

  const output = runResult.startsWith('Error:') ? null : runResult;
  const errorLog = runResult.startsWith('Error:') ? runResult : null;
  if (errorLog) {
    logger.warn(`Teacher execution error in room ${roomCode}: ${errorLog}`);
  }

  const response = {
    id: null,
    nickname: 'Müəllim',
    codeSnapshot: code,
    output,
    errorLog,
    executedAt: new Date().toISOString(),
  };

  // Students watching "Sinifi izlə" default to the teacher's own broadcast
  // (see room.model.js#pinnedParticipant) - they should see its Run results
  // too, not just the code. There's no Participant behind the teacher's
  // code, so this reuses the same /executions topic with the literal
  // string 'teacher' as the participantId - a sentinel, not a real id (see
  // student/page.js, which matches on it the same way it matches a real
  // pinned participantId).
  broadcastExecutionResult(roomCode, 'teacher', response);

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
  executeTeacherCode,
  getRoomHistory,
  getParticipantHistory,
};
