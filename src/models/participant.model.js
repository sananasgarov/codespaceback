const { Schema, model } = require('mongoose');
const Role = require('../enums/role');

// Equivalent of ParticipantEntity.java (@Entity(name = "Participants"))
const participantSchema = new Schema(
  {
    nickname: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      required: true,
    },
    currentCode: {
      type: String,
      default: '',
    },
    sessionId: {
      type: String,
      default: null,
    },
    // Teacher-controlled toggle: when false, this student's editor is
    // read-only. Persisted (not just a live WS signal) so it survives a
    // refresh/reconnect mid-lesson - see participant.service.js#setEditingEnabled,
    // enforced server-side in ws/handlers/codeStream.handler.js's /app/stream
    // handler too (not just a frontend-only lock).
    editingEnabled: {
      type: Boolean,
      default: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
  },
  {
    collection: 'participants',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = model('Participant', participantSchema);
