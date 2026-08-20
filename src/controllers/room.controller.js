const roomService = require('../services/room.service');
const Language = require('../enums/language');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

// Equivalent of controller/RoomController.java

async function createRoom(req, res) {
  logger.info(`API Call: Create room request received for language: ${req.body.language} by teacher ${req.teacher.email}`);

  const data = await roomService.createRoom(req.body, req.teacher.id);

  res.status(201).json(
    apiResponse({ success: true, message: 'Room created successfully', data })
  );
}

async function getMyRooms(req, res) {
  logger.info(`API Call: Fetching rooms for teacher ${req.teacher.email}`);

  const data = await roomService.getRoomsByTeacher(req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Rooms fetched successfully', data })
  );
}

async function getRoom(req, res) {
  logger.info(`API Call: Fetching room details for code: ${req.params.roomCode}`);

  const data = await roomService.getRoomByCode(req.params.roomCode);

  res.status(200).json(
    apiResponse({ success: true, message: 'Room found', data })
  );
}

async function deactivateRoom(req, res) {
  logger.warn(`API Call: Deactivating room with code: ${req.params.roomCode} by teacher ${req.teacher.email}`);

  await roomService.deleteRoom(req.params.roomCode, req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Room has been deactivated' })
  );
}

async function activateRoom(req, res) {
  logger.info(`API Call: Reactivating room with code: ${req.params.roomCode} by teacher ${req.teacher.email}`);

  const data = await roomService.activateRoom(req.params.roomCode, req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Room has been reactivated', data })
  );
}

async function deleteRoomPermanently(req, res) {
  logger.warn(`API Call: Permanently deleting room with code: ${req.params.roomCode} by teacher ${req.teacher.email}`);

  await roomService.deleteRoomPermanently(req.params.roomCode, req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Room has been permanently deleted' })
  );
}

async function pinParticipant(req, res) {
  logger.info(
    `API Call: Pin request for room ${req.params.roomCode} -> participant ${req.body.participantId || '(none)'} by teacher ${req.teacher.email}`
  );

  const data = await roomService.setPinnedParticipant(req.params.roomCode, req.teacher.id, req.body.participantId);

  res.status(200).json(
    apiResponse({ success: true, message: 'Pinned participant updated', data })
  );
}

async function setPause(req, res) {
  logger.info(
    `API Call: ${req.body.paused ? 'Pause' : 'Resume'} request for room ${req.params.roomCode} by teacher ${req.teacher.email}`
  );

  const data = await roomService.setTeacherPaused(req.params.roomCode, req.teacher.id, req.body.paused);

  res.status(200).json(
    apiResponse({ success: true, message: `Teacher editor ${req.body.paused ? 'paused' : 'resumed'}`, data })
  );
}

async function setTask(req, res) {
  const isClearing = req.body.title === null;
  logger.info(
    `API Call: ${isClearing ? 'Clear task' : 'Assign task'} request for room ${req.params.roomCode} by teacher ${req.teacher.email}`
  );

  const data = await roomService.setCurrentTask(
    req.params.roomCode,
    req.teacher.id,
    isClearing ? null : { title: req.body.title, description: req.body.description }
  );

  res.status(200).json(
    apiResponse({ success: true, message: isClearing ? 'Task cleared' : 'Task assigned', data })
  );
}

async function setAiChat(req, res) {
  logger.info(
    `API Call: ${req.body.enabled ? 'Enable' : 'Disable'} AI chat for room ${req.params.roomCode} by teacher ${req.teacher.email}`
  );

  const data = await roomService.setAiChatEnabled(req.params.roomCode, req.teacher.id, req.body.enabled);

  res.status(200).json(
    apiResponse({ success: true, message: `AI chat ${req.body.enabled ? 'enabled' : 'disabled'}`, data })
  );
}

async function cleanupEmptyRooms(req, res) {
  logger.info('API Call: Manual cleanup triggered for empty rooms');

  await roomService.deactivateEmptyRooms();

  res.status(200).json(
    apiResponse({ success: true, message: 'Cleanup process finished successfully' })
  );
}

function getLanguages(req, res) {
  res.status(200).json(
    apiResponse({ success: true, message: 'Languages fetched successfully', data: Object.values(Language) })
  );
}

module.exports = {
  createRoom,
  getRoom,
  getMyRooms,
  deactivateRoom,
  activateRoom,
  deleteRoomPermanently,
  pinParticipant,
  setPause,
  setTask,
  setAiChat,
  cleanupEmptyRooms,
  getLanguages,
};
