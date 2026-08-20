const roomRepository = require('../repositories/room.repository');
const participantRepository = require('../repositories/participant.repository');
const executionLogRepository = require('../repositories/executionLog.repository');
const roomBanRepository = require('../repositories/roomBan.repository');
const roomMapper = require('../mappers/room.mapper');
const RoomStatus = require('../enums/roomStatus');
const RoomNotFoundException = require('../errors/RoomNotFoundException');
const ParticipantNotFoundException = require('../errors/ParticipantNotFoundException');
const ForbiddenException = require('../errors/ForbiddenException');
const messagingTemplate = require('../ws/messagingTemplate');
const {
  buildRoomClosedPayload,
  buildPinnedPayload,
  buildTeacherPausedPayload,
  buildTaskPayload,
  buildAiChatEnabledPayload,
  buildTeacherCodePayload,
} = require('../ws/payloads');
const logger = require('../utils/logger');

// Equivalent of service/RoomService.java

async function createRoom(request, teacherId) {
  logger.info(`Request received to create a new room for language: ${request.language} (teacher=${teacherId})`);

  const roomCode = await generateUniqueRoomCode();
  const room = await roomRepository.create({ language: request.language, roomCode, teacher: teacherId });

  logger.info(`Room created successfully with code: ${roomCode}`);
  return roomMapper.toResponse(room);
}

async function getRoomsByTeacher(teacherId) {
  logger.info(`Fetching rooms owned by teacher: ${teacherId}`);
  const rooms = await roomRepository.findByTeacher(teacherId);
  return roomMapper.toResponseList(rooms);
}

async function getRoomByCode(roomCode) {
  logger.info(`Fetching room details for room code: ${roomCode}`);

  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) {
    logger.error(`Room not found with code: ${roomCode}`);
    throw new RoomNotFoundException(roomCode);
  }

  return roomMapper.toResponse(room);
}

// Shared by every "teacher modifies their own room" action below (deactivate,
// pin, pause, assign task, stream their own code). Rooms created before
// ownership tracking existed (teacher === null) can't be claimed this way
// either - they're simply not manageable through any of these routes.
async function getOwnedRoomOrThrow(roomCode, teacherId) {
  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) {
    throw new RoomNotFoundException(roomCode);
  }

  if (!room.teacher || String(room.teacher) !== String(teacherId)) {
    logger.warn(`Forbidden: teacher ${teacherId} attempted to modify room ${roomCode} they do not own`);
    throw new ForbiddenException('You can only manage rooms you created');
  }

  return room;
}

async function deleteRoom(roomCode, teacherId) {
  logger.warn(`Request to deactivate room with code: ${roomCode}`);

  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  room.status = RoomStatus.PASSIVE;
  await roomRepository.save(room);
  logger.info(`Room with code: ${roomCode} has been successfully deactivated`);

  broadcastToStatus(roomCode, buildRoomClosedPayload());
}

// Reverses deleteRoom above - a passive room is otherwise stuck that way
// forever (joinRoom rejects anything non-ACTIVE, and nothing else ever
// flips status back). Gated by requireActiveAccess at the route level, same
// as creating a brand-new room - reactivating shouldn't be a free way around
// a lapsed trial/subscription.
async function activateRoom(roomCode, teacherId) {
  logger.info(`Request to reactivate room with code: ${roomCode}`);

  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  room.status = RoomStatus.ACTIVE;
  await roomRepository.save(room);
  logger.info(`Room with code: ${roomCode} has been successfully reactivated`);

  return roomMapper.toResponse(room);
}

// Unlike deleteRoom (soft: flips status to PASSIVE, keeps everything for the
// dashboard's history), this is irreversible - the room and every
// participant/execution log/ban it ever had are gone for good. Anyone still
// connected gets the same roomClosed broadcast deleteRoom sends, since the
// room disappears out from under them either way.
async function deleteRoomPermanently(roomCode, teacherId) {
  logger.warn(`Request to PERMANENTLY delete room with code: ${roomCode}`);

  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  broadcastToStatus(roomCode, buildRoomClosedPayload());

  await Promise.all([
    participantRepository.deleteAllByRoom(room._id),
    executionLogRepository.deleteAllByRoom(room._id),
    roomBanRepository.deleteAllByRoom(room._id),
  ]);
  await roomRepository.deleteById(room._id);

  logger.warn(`Room ${roomCode} and all of its data permanently deleted by teacher ${teacherId}`);
}

// Sets (or clears, participantId === null) which participant's editor
// everyone else in the room sees by default instead of the teacher's own -
// see room.model.js#pinnedParticipant.
async function setPinnedParticipant(roomCode, teacherId, participantId) {
  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  if (participantId) {
    const participant = await participantRepository.findById(participantId);
    if (!participant || !participant.room || participant.room.roomCode !== roomCode) {
      throw new ParticipantNotFoundException(participantId);
    }
  }

  room.pinnedParticipant = participantId || null;
  await roomRepository.save(room);
  logger.info(`Room ${roomCode}: pinned participant set to ${participantId || '(none - back to teacher view)'}`);

  broadcastToStatus(roomCode, buildPinnedPayload(participantId || null));

  return roomMapper.toResponse(room);
}

// Pausing freezes what students see (the /app/room-editor-stream handler
// keeps persisting the teacher's edits but stops broadcasting them) without
// stopping the teacher from typing - resuming immediately catches everyone
// up with one broadcast of whatever was saved while paused.
async function setTeacherPaused(roomCode, teacherId, paused) {
  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  const wasPaused = room.teacherEditorPaused;
  room.teacherEditorPaused = paused;
  await roomRepository.save(room);
  logger.info(`Room ${roomCode}: teacher editor ${paused ? 'paused' : 'resumed'}`);

  broadcastToStatus(roomCode, buildTeacherPausedPayload(paused));

  if (wasPaused && !paused) {
    broadcastTeacherCode(roomCode, room.teacherCode);
  }

  return roomMapper.toResponse(room);
}

// task === null clears the active assignment; otherwise replaces it outright
// (single active task per room, no history - see room.model.js#currentTask).
async function setCurrentTask(roomCode, teacherId, task) {
  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  room.currentTask = task ? { title: task.title, description: task.description || '', assignedAt: new Date() } : null;
  await roomRepository.save(room);
  logger.info(`Room ${roomCode}: task ${task ? `assigned ("${task.title}")` : 'cleared'}`);

  broadcastToStatus(roomCode, buildTaskPayload(room.currentTask));

  return roomMapper.toResponse(room);
}

// Teacher-controlled on/off switch for the student-facing AI chat widget
// (see aiChat.service.js#askAssistant, which enforces this server-side too -
// not just hiding the widget client-side). Broadcast live so an already-open
// student page reacts immediately instead of only on next load.
async function setAiChatEnabled(roomCode, teacherId, enabled) {
  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  room.aiChatEnabled = enabled;
  await roomRepository.save(room);
  logger.info(`Room ${roomCode}: AI chat ${enabled ? 'enabled' : 'disabled'}`);

  broadcastToStatus(roomCode, buildAiChatEnabledPayload(enabled));

  return roomMapper.toResponse(room);
}

// Called by the /app/room-editor-stream WS handler on every (debounced)
// keystroke in the teacher's own editor. Always persists so a resume/reload
// reflects the latest text; only broadcasts live while not paused.
async function streamTeacherCode(roomCode, teacherId, code) {
  const room = await getOwnedRoomOrThrow(roomCode, teacherId);

  room.teacherCode = code;
  await roomRepository.save(room);

  if (!room.teacherEditorPaused) {
    broadcastTeacherCode(roomCode, code);
  }
}

// Best-effort like every other broadcast in this codebase (see
// participant.service.js) - a failure here must never block the DB write
// that already committed.
function broadcastToStatus(roomCode, payload) {
  try {
    messagingTemplate.convertAndSend(`/topic/room/${roomCode}/status`, payload);
  } catch (err) {
    logger.error('Failed to broadcast room status event:', err);
  }
}

function broadcastTeacherCode(roomCode, code) {
  try {
    messagingTemplate.convertAndSend(`/topic/room/${roomCode}/teacher`, buildTeacherCodePayload(code));
  } catch (err) {
    logger.error('Failed to broadcast teacher code:', err);
  }
}

async function generateUniqueRoomCode() {
  logger.debug('Generating a unique 6-digit room code...');
  let code;
  let attempts = 0;
  do {
    attempts += 1;
    code = String(100000 + Math.floor(Math.random() * 900000));
    // eslint-disable-next-line no-await-in-loop
  } while (await roomRepository.existsByRoomCode(code));

  logger.debug(`Unique code generated: ${code} after ${attempts} attempt(s)`);
  return code;
}

async function deactivateEmptyRooms() {
  logger.info('Starting scheduled cleanup for empty active rooms...');

  const emptyRooms = await roomRepository.findEmptyRoomsByStatus(RoomStatus.ACTIVE);

  if (emptyRooms.length === 0) {
    logger.info('Cleanup finished: No empty active rooms found.');
    return;
  }

  logger.info(`Found ${emptyRooms.length} empty room(s) to deactivate.`);
  emptyRooms.forEach((room) => {
    room.status = RoomStatus.PASSIVE;
    logger.debug(`Deactivating room code: ${room.roomCode}`);
  });

  await roomRepository.saveAll(emptyRooms);
  logger.info('Successfully deactivated all empty rooms.');
}

module.exports = {
  createRoom,
  getRoomByCode,
  getRoomsByTeacher,
  deleteRoom,
  activateRoom,
  deleteRoomPermanently,
  deactivateEmptyRooms,
  setPinnedParticipant,
  setTeacherPaused,
  setCurrentTask,
  setAiChatEnabled,
  streamTeacherCode,
};
