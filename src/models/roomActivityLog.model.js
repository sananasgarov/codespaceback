const { Schema, model } = require('mongoose');

// A simple audit trail of who joined/left a room, and when, for the
// teacher's "Tarixçə" (history) modal - see room.service.js#getRoomActivity.
// participantId is a plain id (not a `ref`/populate target) because a
// participant is deleted on kick/ban (see participant.service.js) - the
// log has to survive that, so it snapshots nickname at the time of the
// event instead of relying on the Participant document still existing.
const roomActivityLogSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    nickname: {
      type: String,
      required: true,
    },
    // TAB_HIDDEN/TAB_VISIBLE come from the Page Visibility API (see
    // /app/visibility in codeStream.handler.js) - the student tabbed away
    // or back while still connected, distinct from LEFT (a real disconnect).
    type: {
      type: String,
      enum: ['JOINED', 'LEFT', 'KICKED', 'BANNED', 'TAB_HIDDEN', 'TAB_VISIBLE'],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'room_activity_logs',
  }
);

roomActivityLogSchema.index({ room: 1, at: -1 });

module.exports = model('RoomActivityLog', roomActivityLogSchema);
