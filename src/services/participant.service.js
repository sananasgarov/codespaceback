const participantRepository = require('../repositories/participant.repository');
const roomRepository = require('../repositories/room.repository');
const participantMapper = require('../mappers/participant.mapper');
const Role = require('../enums/role');
const RoomStatus = require('../enums/roomStatus');
const RoomNotFoundException = require('../errors/RoomNotFoundException');
const RoomNotActiveException = require('../errors/RoomNotActiveException');
const NicknameAlreadyTakenException = require('../errors/NicknameAlreadyTakenException');
const ParticipantNotFoundException = require('../errors/ParticipantNotFoundException');
const ForbiddenException = require('../errors/ForbiddenException');
const messagingTemplate = require('../ws/messagingTemplate');
const { buildJoinPayload, buildEditingEnabledPayload } = require('../ws/payloads');
const logger = require('../utils/logger');

// Equivalent of service/ParticipantService.java

async function joinRoom(request) {
  logger.info(`Process started: User '${request.nickname}' attempting to join room '${request.roomCode}'`);

  const room = await roomRepository.findByRoomCode(request.roomCode);
  if (!room) {
    logger.error(`Join failed: Room code '${request.roomCode}' not found`);
    throw new RoomNotFoundException(request.roomCode);
  }

  if (room.status !== RoomStatus.ACTIVE) {
    logger.warn(`Join failed: Room '${request.roomCode}' is currently ${room.status}`);
    throw new RoomNotActiveException(request.roomCode);
  }

  const existing = await participantRepository.findByNicknameAndRoomCode(request.nickname, request.roomCode);
  if (existing) {
    logger.warn(`Join failed: Nickname '${request.nickname}' is already taken in room '${request.roomCode}'`);
    throw new NicknameAlreadyTakenException(request.nickname);
  }

  // Every joining participant is assigned STUDENT (mirrors the current,
  // non-commented-out logic in ParticipantService.java - teacher role is not
  // auto-assigned to the first joiner).
  const assignedRole = Role.STUDENT;
  logger.debug(`Assigning role '${assignedRole}' to user '${request.nickname}'`);

  const participant = await participantRepository.create({
    nickname: request.nickname,
    role: assignedRole,
    currentCode: '',
    room: room._id,
  });

  logger.info(`Success: User '${participant.nickname}' joined room '${request.roomCode}' as ${assignedRole}`);

  broadcastParticipantJoined(room.roomCode, participant);

  // Pass roomCode explicitly - participant.room is just an ObjectId here,
  // not a populated document (no re-fetch needed for the response DTO).
  return participantMapper.toResponse(participant, room.roomCode);
}

// Lets an open teacher dashboard pick up a new student immediately, instead
// of waiting for the student's first code keystroke (which is the only other
// event that touches this topic - see ws/handlers/codeStream.handler.js).
function broadcastParticipantJoined(roomCode, participant) {
  try {
    messagingTemplate.convertAndSend(
      `/topic/room/${roomCode}/participants`,
      buildJoinPayload(participant.id, participant.nickname, participant.role)
    );
  } catch (err) {
    logger.error('Failed to broadcast participant joined:', err);
  }
}

async function getParticipantsByRoom(roomCode) {
  logger.info(`Fetching all participants for room: ${roomCode}`);
  const participants = await participantRepository.findAllByRoomCode(roomCode);
  return participantMapper.toResponseList(participants);
}

async function updateParticipantCode(participantId, code, roomCode) {
  logger.info(`Updating code for participantId=${participantId}`);

  const participant = await participantRepository.findById(participantId);
  if (!participant) {
    throw new ParticipantNotFoundException(participantId);
  }

  // Reject a save aimed at a participant who isn't actually in roomCode -
  // otherwise a client could overwrite a stranger's saved code just by
  // guessing/observing their participantId.
  if (!participant.room || participant.room.roomCode !== roomCode) {
    logger.warn(`Rejected code update: participant ${participantId} does not belong to room ${roomCode}`);
    throw new ParticipantNotFoundException(participantId);
  }

  participant.currentCode = code;
  await participantRepository.save(participant);

  logger.info(`Code updated for participant '${participant.nickname}' by teacher`);
}

// Teacher-controlled, persisted toggle for whether this student may type in
// their own editor at all (see participant.model.js#editingEnabled) -
// distinct from `locked` (buildEditLockPayload), which only reflects "the
// 1:1 review panel happens to be open right now" and isn't persisted.
async function setEditingEnabled(participantId, teacherId, editingEnabled) {
  logger.info(`Setting editingEnabled=${editingEnabled} for participantId=${participantId}`);

  const participant = await participantRepository.findById(participantId);
  if (!participant || !participant.room) {
    throw new ParticipantNotFoundException(participantId);
  }

  const room = await roomRepository.findByRoomCode(participant.room.roomCode);
  if (!room || !room.teacher || String(room.teacher) !== String(teacherId)) {
    logger.warn(
      `Forbidden: teacher ${teacherId} attempted to toggle editingEnabled for participant ${participantId} in a room they do not own`
    );
    throw new ForbiddenException('You can only manage participants in rooms you created');
  }

  participant.editingEnabled = editingEnabled;
  await participantRepository.save(participant);

  logger.info(`Participant '${participant.nickname}' editingEnabled=${editingEnabled}`);

  broadcastEditingEnabled(room.roomCode, participant.id, editingEnabled);

  return participantMapper.toResponse(participant, room.roomCode);
}

function broadcastEditingEnabled(roomCode, participantId, editingEnabled) {
  try {
    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(destination, buildEditingEnabledPayload(participantId, editingEnabled));
  } catch (err) {
    logger.error('Failed to broadcast editingEnabled change:', err);
  }
}

module.exports = {
  joinRoom,
  getParticipantsByRoom,
  updateParticipantCode,
  setEditingEnabled,
};
