const { Schema, model } = require('mongoose');

// Equivalent of ExecutionLogEntity.java (@Table(name = "execution_logs"))
const executionLogSchema = new Schema(
  {
    participant: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    codeSnapshot: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      default: null,
    },
    errorLog: {
      type: String,
      default: null,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'execution_logs',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = model('ExecutionLog', executionLogSchema);
