const { mongoose, connectDatabase } = require('../config/db');
const Room = require('./room.model');
const Participant = require('./participant.model');
const ExecutionLog = require('./executionLog.model');

// Relations are expressed via Schema.Types.ObjectId + `ref` in each model
// (see participant.model.js / executionLog.model.js) - Mongoose has no
// separate association-wiring step the way Sequelize does.

module.exports = {
  mongoose,
  connectDatabase,
  Room,
  Participant,
  ExecutionLog,
};
