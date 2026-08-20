const participantService = require('../services/participant.service');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

// Equivalent of controller/ParticipantController.java

async function joinRoom(req, res) {
  logger.info(`API Call: User ${req.body.nickname} joining room ${req.body.roomCode}`);

  const data = await participantService.joinRoom(req.body);

  res.status(201).json(
    apiResponse({ success: true, message: 'Joined room successfully', data })
  );
}

async function getRoomParticipants(req, res) {
  logger.info(`API Call: Fetching participants for room ${req.params.roomCode}`);

  const data = await participantService.getParticipantsByRoom(req.params.roomCode);

  res.status(200).json(
    apiResponse({ success: true, message: 'Participants fetched successfully', data })
  );
}

async function setAccess(req, res) {
  logger.info(
    `API Call: Set editingEnabled=${req.body.editingEnabled} for participant ${req.params.participantId} by teacher ${req.teacher.email}`
  );

  const data = await participantService.setEditingEnabled(
    req.params.participantId,
    req.teacher.id,
    req.body.editingEnabled
  );

  res.status(200).json(
    apiResponse({ success: true, message: 'Participant access updated', data })
  );
}

async function kickParticipant(req, res) {
  logger.info(
    `API Call: Kicking participant ${req.params.participantId} by teacher ${req.teacher.email}`
  );

  await participantService.kickParticipant(req.params.participantId, req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Participant removed from room', data: null })
  );
}

module.exports = {
  joinRoom,
  getRoomParticipants,
  setAccess,
  kickParticipant,
};
