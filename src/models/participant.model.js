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
    // Captured from req.ip at join time - lets a teacher ban (see
    // participant.service.js#banParticipant / roomBan.model.js) block by IP
    // as well as nickname, so a banned student can't just rejoin under a new
    // name from the same connection. Not shown to the teacher UI (privacy) -
    // only ever compared internally against the ban list.
    joinIp: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'participants',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = model('Participant', participantSchema);
