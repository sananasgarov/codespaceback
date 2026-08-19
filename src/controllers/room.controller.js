const roomService = require('../services/room.service');
const Language = require('../enums/language');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

// Equivalent of controller/RoomController.java

async function createRoom(req, res) {
  logger.info(`API Call: Create room request received for language: ${req.body.language}`);

  const data = await roomService.createRoom(req.body);

  res.status(201).json(
    apiResponse({ success: true, message: 'Room created successfully', data })
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
  logger.warn(`API Call: Deactivating room with code: ${req.params.roomCode}`);

  await roomService.deleteRoom(req.params.roomCode);

  res.status(200).json(
    apiResponse({ success: true, message: 'Room has been deactivated' })
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
  deactivateRoom,
  cleanupEmptyRooms,
  getLanguages,
};
