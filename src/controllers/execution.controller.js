const executionService = require('../services/execution.service');

// Equivalent of controller/ExecutionController.java
// Note: this controller returns the raw ExecutionResponse (no ApiResponse
// envelope), exactly like the original Spring controller.

async function runCode(req, res) {
  const data = await executionService.executeCode(req.body);
  res.status(200).json(data);
}

async function getRoomHistory(req, res) {
  const data = await executionService.getRoomHistory(req.params.roomCode);
  res.status(200).json(data);
}

async function getParticipantHistory(req, res) {
  const data = await executionService.getParticipantHistory(req.params.participantId, req.query.roomCode);
  res.status(200).json(data);
}

module.exports = {
  runCode,
  getRoomHistory,
  getParticipantHistory,
};
