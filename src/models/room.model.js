const { Schema, model } = require('mongoose');
const Language = require('../enums/language');
const RoomStatus = require('../enums/roomStatus');

// Equivalent of RoomEntity.java (@Entity(name = "Rooms"))
const roomSchema = new Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
    },
    language: {
      type: String,
      enum: Object.values(Language),
    },
    status: {
      type: String,
      enum: Object.values(RoomStatus),
      default: RoomStatus.ACTIVE,
    },
    // The teacher who owns this room - required for every newly created room
    // (set from the authenticated req.teacher, never from client input) so
    // ownership can be enforced on deactivate and rooms can be listed per
    // teacher. Left non-required at the schema level only so any rooms that
    // pre-date this field don't fail validation on read.
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    // "Classroom" broadcast state - what every student sees by default is
    // the teacher's own live code (teacherCode); the teacher can instead pin
    // one student's editor as the shared view for everyone else
    // (pinnedParticipant), and can pause their own broadcast so students
    // stop seeing updates mid-edit until resumed (teacherEditorPaused).
    // See room.service.js#setPinnedParticipant/setTeacherPaused and
    // ws/handlers/codeStream.handler.js#/app/room-editor-stream.
    teacherCode: {
      type: String,
      default: '',
    },
    teacherEditorPaused: {
      type: Boolean,
      default: false,
    },
    pinnedParticipant: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      default: null,
    },
    // Single active assignment shown to everyone in the room; assigning a
    // new one replaces it outright (no history kept, by design - see
    // room.service.js#setCurrentTask).
    currentTask: {
      type: new Schema(
        {
          title: { type: String, required: true, trim: true, maxlength: 200 },
          description: { type: String, default: '', trim: true, maxlength: 5000 },
          assignedAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Teacher-controlled switch for the student-facing AI chat widget (see
    // aiChat.service.js) - defaults on, but a teacher may not want it
    // available for a given lesson/exam. Enforced server-side in
    // askAssistant, not just hidden client-side.
    aiChatEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'rooms',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roomSchema.index({ teacher: 1, createdAt: -1 });

// Mirrors @PrePersist onCreate() in RoomEntity.java
roomSchema.pre('save', function onCreate(next) {
  if (this.isNew) {
    this.createdAt = this.createdAt || new Date();
    this.status = this.status || RoomStatus.ACTIVE;
  }
  next();
});

module.exports = model('Room', roomSchema);
