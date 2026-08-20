const roomRepository = require('../repositories/room.repository');
const roomMapper = require('../mappers/room.mapper');
const RoomStatus = require('../enums/roomStatus');
const RoomNotFoundException = require('../errors/RoomNotFoundException');
const ForbiddenException = require('../errors/ForbiddenException');
const messagingTemplate = require('../ws/messagingTemplate');
const { buildRoomClosedPayload } = require('../ws/payloads');
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

async function deleteRoom(roomCode, teacherId) {
  logger.warn(`Request to deactivate room with code: ${roomCode}`);

  const room = await roomRepository.findByRoomCode(roomCode);
  if (!room) {
    logger.error(`Failed to deactivate: Room not found with code: ${roomCode}`);
    throw new RoomNotFoundException(roomCode);
  }

  // Only the owning teacher may deactivate their own room. Rooms created
  // before ownership tracking existed (teacher === null) can't be claimed
  // this way either - they're simply not deactivatable through this route.
  if (!room.teacher || String(room.teacher) !== String(teacherId)) {
    logger.warn(`Forbidden: teacher ${teacherId} attempted to deactivate room ${roomCode} they do not own`);
    throw new ForbiddenException('You can only deactivate rooms you created');
  }

  room.status = RoomStatus.PASSIVE;
  await roomRepository.save(room);
  logger.info(`Room with code: ${roomCode} has been successfully deactivated`);

  broadcastRoomClosed(roomCode);
}

// Tells everyone currently connected to this room (teacher dashboard +
// every student tab) that it's closed, so the frontend can redirect them
// all out to the home page. Best-effort like the other broadcasts in this
// codebase (see participant.service.js) - a failure here must never block
// the deactivation itself, which has already been committed to the DB.
function broadcastRoomClosed(roomCode) {
  try {
    messagingTemplate.convertAndSend(`/topic/room/${roomCode}/status`, buildRoomClosedPayload());
    logger.info(`Room closed broadcast sent for room=${roomCode}`);
  } catch (err) {
    logger.error('Failed to broadcast room closed:', err);
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
  deactivateEmptyRooms,
};
