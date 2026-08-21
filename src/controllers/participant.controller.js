const participantService = require('../services/participant.service');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

// Equivalent of controller/ParticipantController.java

async function joinRoom(req, res) {
  logger.info(`API Call: User ${req.body.nickname} joining room ${req.body.roomCode}`);

  // req.ip, not client-supplied - app.set('trust proxy', 1) makes this the
  // real client IP behind one reverse-proxy hop (see app.js). Used only to
  // enforce a teacher's ban by IP (participant.service.js#banParticipant),
  // never shown to the teacher UI.
  const data = await participantService.joinRoom({ ...req.body, ip: req.ip });

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

async function getOwnCode(req, res) {
  const data = await participantService.getOwnCode(req.params.participantId, req.query.roomCode);

  res.status(200).json(
    apiResponse({ success: true, message: 'Code fetched successfully', data })
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

async function banParticipant(req, res) {
  logger.info(
    `API Call: Banning participant ${req.params.participantId} by teacher ${req.teacher.email}`
  );

  const data = await participantService.banParticipant(req.params.participantId, req.teacher.id);

  res.status(200).json(
    apiResponse({ success: true, message: 'Participant banned from room', data })
  );
}

module.exports = {
  joinRoom,
  getRoomParticipants,
  setAccess,
  getOwnCode,
  kickParticipant,
  banParticipant,
};
