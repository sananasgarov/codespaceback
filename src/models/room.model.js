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
    createdAt: {
      type: Date,
      default: Date.now,
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
