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
