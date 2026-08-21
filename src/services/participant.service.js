const participantRepository = require('../repositories/participant.repository');
const roomRepository = require('../repositories/room.repository');
const roomBanRepository = require('../repositories/roomBan.repository');
const roomActivityLogRepository = require('../repositories/roomActivityLog.repository');
const roomService = require('./room.service');
const participantMapper = require('../mappers/participant.mapper');
const Role = require('../enums/role');
const RoomStatus = require('../enums/roomStatus');
const RoomNotFoundException = require('../errors/RoomNotFoundException');
const RoomNotActiveException = require('../errors/RoomNotActiveException');
const NicknameAlreadyTakenException = require('../errors/NicknameAlreadyTakenException');
const ParticipantNotFoundException = require('../errors/ParticipantNotFoundException');
const ParticipantBannedException = require('../errors/ParticipantBannedException');
const ForbiddenException = require('../errors/ForbiddenException');
const messagingTemplate = require('../ws/messagingTemplate');
const env = require('../config/env');
const {
  buildJoinPayload,
  buildEditingEnabledPayload,
  buildKickedPayload,
  buildParticipantRemovedPayload,
} = require('../ws/payloads');
const logger = require('../utils/logger');

// Equivalent of service/ParticipantService.java

async function joinRoom(request) {
  logger.info(`Process started: User '${request.nickname}' attempting to join room '${request.roomCode}'`);

  const room = await roomRepository.findByRoomCode(request.roomCode);
  if (!room) {
    logger.error(`Join failed: Room code '${request.roomCode}' not found`);
    throw new RoomNotFoundException(request.roomCode);
  }

  // Lazy expiry: this app has no background scheduler (see
  // room.service.js#applyExpiry), so a room's chosen duration is only
  // enforced when something actually reads the room - a join attempt is
  // exactly that, and it's the one place expiry absolutely must be caught
  // before letting someone in.
  await roomService.applyExpiry(room);

  if (room.status !== RoomStatus.ACTIVE) {
    logger.warn(`Join failed: Room '${request.roomCode}' is currently ${room.status}`);
    throw new RoomNotActiveException(request.roomCode);
  }

  const activeBan = await roomBanRepository.findActiveBan(room._id, request.nickname, request.ip);
  if (activeBan) {
    logger.warn(`Join failed: '${request.nickname}' is banned from room '${request.roomCode}' until ${activeBan.bannedUntil.toISOString()}`);
    throw new ParticipantBannedException(activeBan.bannedUntil);
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
    joinIp: request.ip || null,
  });

  logger.info(`Success: User '${participant.nickname}' joined room '${request.roomCode}' as ${assignedRole}`);

  broadcastParticipantJoined(room.roomCode, participant);
  await logActivity(room._id, participant.id, participant.nickname, 'JOINED');

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

// Best-effort like every broadcast above - a logging hiccup must never fail
// the join/kick/ban action that's already committed. Feeds the teacher's
// "Tarixçə" (history) modal - see room.service.js#getRoomActivity.
async function logActivity(roomId, participantId, nickname, type) {
  try {
    await roomActivityLogRepository.create({ room: roomId, participantId, nickname, type });
  } catch (err) {
    logger.error(`Failed to write room activity log (${type}):`, err);
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

// Lets a student's own page recover its last saved code after a refresh or
// reconnect - /app/stream already persists currentCode on every keystroke
// (see codeStream.handler.js), but until now nothing ever read it back on
// load, so the editor just came back empty even though the code was safe in
// the DB the whole time. Deliberately returns only {id, currentCode} - not
// the shared participantMapper - so this never leaks into
// getParticipantsByRoom's unauthenticated room-wide list below.
async function getOwnCode(participantId, roomCode) {
  const participant = await participantRepository.findById(participantId);
  if (!participant || !participant.room || participant.room.roomCode !== roomCode) {
    throw new ParticipantNotFoundException(participantId);
  }

  return { id: participant.id, currentCode: participant.currentCode || '' };
}

// Shared by kickParticipant/banParticipant below: loads the participant,
// checks they belong to a room the caller actually owns, and throws
// otherwise. Both actions are "remove this student from the room" - they
// only differ in whether a re-join is blocked afterwards.
async function getOwnedParticipantOrThrow(participantId, teacherId) {
  const participant = await participantRepository.findById(participantId);
  if (!participant || !participant.room) {
    throw new ParticipantNotFoundException(participantId);
  }

  const room = await roomRepository.findByRoomCode(participant.room.roomCode);
  if (!room || !room.teacher || String(room.teacher) !== String(teacherId)) {
    logger.warn(
      `Forbidden: teacher ${teacherId} attempted to manage participant ${participantId} in a room they do not own`
    );
    throw new ForbiddenException('You can only manage participants in rooms you created');
  }

  return { participant, room };
}

// Teacher-only: permanently removes a student from the room. Unlike
// setEditingEnabled (which just locks the editor), this deletes the
// participant outright, so the student is forced back to the join screen and
// the nickname becomes free again - and, unlike banParticipant below, free
// to rejoin immediately.
async function kickParticipant(participantId, teacherId) {
  logger.info(`Kicking participantId=${participantId}`);

  const { participant, room } = await getOwnedParticipantOrThrow(participantId, teacherId);

  broadcastKicked(room.roomCode, participant.id);
  await participantRepository.deleteById(participant.id);
  broadcastParticipantRemoved(room.roomCode, participant.id);
  await logActivity(room._id, participant.id, participant.nickname, 'KICKED');

  logger.info(`Participant '${participant.nickname}' kicked from room '${room.roomCode}' by teacher ${teacherId}`);
}

// Teacher-only: kicks the student like kickParticipant, and additionally
// blocks that nickname AND their joinIp from rejoining this room until
// BAN_DURATION_HOURS has passed (see roomBan.repository.js and joinRoom's
// ban check above) - closes the "just pick a new nickname" bypass for
// anyone who also isn't switching networks.
async function banParticipant(participantId, teacherId) {
  logger.info(`Banning participantId=${participantId}`);

  const { participant, room } = await getOwnedParticipantOrThrow(participantId, teacherId);

  const bannedUntil = new Date(Date.now() + env.banDurationHours * 60 * 60 * 1000);
  await roomBanRepository.upsertBan(room._id, participant.nickname, participant.joinIp, bannedUntil, teacherId);

  broadcastKicked(room.roomCode, participant.id, bannedUntil);
  await participantRepository.deleteById(participant.id);
  broadcastParticipantRemoved(room.roomCode, participant.id);
  await logActivity(room._id, participant.id, participant.nickname, 'BANNED');

  logger.info(
    `Participant '${participant.nickname}' banned from room '${room.roomCode}' by teacher ${teacherId} until ${bannedUntil.toISOString()}`
  );

  return { bannedUntil };
}

function broadcastKicked(roomCode, participantId, bannedUntil) {
  try {
    const destination = `/topic/room/${roomCode}/participant/${participantId}/edit`;
    messagingTemplate.convertAndSend(
      destination,
      buildKickedPayload(participantId, bannedUntil ? bannedUntil.toISOString() : undefined)
    );
  } catch (err) {
    logger.error('Failed to broadcast kicked:', err);
  }
}

function broadcastParticipantRemoved(roomCode, participantId) {
  try {
    messagingTemplate.convertAndSend(
      `/topic/room/${roomCode}/participants`,
      buildParticipantRemovedPayload(participantId)
    );
  } catch (err) {
    logger.error('Failed to broadcast participant removed:', err);
  }
}

module.exports = {
  joinRoom,
  getParticipantsByRoom,
  updateParticipantCode,
  setEditingEnabled,
  kickParticipant,
  banParticipant,
  getOwnCode,
};
