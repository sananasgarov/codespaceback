const { mongoose, connectDatabase } = require('../config/db');
const Room = require('./room.model');
const Participant = require('./participant.model');
const ExecutionLog = require('./executionLog.model');
const Teacher = require('./teacher.model');
const TaskTemplate = require('./taskTemplate.model');
const RoomBan = require('./roomBan.model');

// Relations are expressed via Schema.Types.ObjectId + `ref` in each model
// (see participant.model.js / executionLog.model.js / room.model.js) -
// Mongoose has no separate association-wiring step the way Sequelize does.

module.exports = {
  mongoose,
  connectDatabase,
  Room,
  Participant,
  ExecutionLog,
  Teacher,
  TaskTemplate,
  RoomBan,
};
