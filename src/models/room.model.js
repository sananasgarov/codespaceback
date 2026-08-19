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

// Mirrors @PrePersist onCreate() in RoomEntity.java
roomSchema.pre('save', function onCreate(next) {
  if (this.isNew) {
    this.createdAt = this.createdAt || new Date();
    this.status = this.status || RoomStatus.ACTIVE;
  }
  next();
});

module.exports = model('Room', roomSchema);
