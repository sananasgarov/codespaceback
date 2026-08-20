const { Schema, model } = require('mongoose');

// Teacher account. Students never get an account - they just join a room
// with a code + nickname (see participant.model.js) - so this collection only
// exists to gate room *creation* behind login + the trial/subscription check.
const teacherSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    // Never selected by default - callers must opt in with .select('+passwordHash')
    // (see teacher.repository.js) so a stray `Teacher.find()` elsewhere in the
    // codebase can never leak a hash into an API response by accident.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Free trial window, computed once at registration time from TRIAL_DAYS.
    // Stored (not recomputed from createdAt on every check) so a later change
    // to TRIAL_DAYS never retroactively shortens/extends an existing teacher's trial.
    trialEndsAt: {
      type: Date,
      required: true,
    },
    subscription: {
      active: { type: Boolean, default: false },
      // null currentPeriodEnd + active:true would mean "active forever" -
      // reserved for a future manual/lifetime grant, unused by the normal flow.
      currentPeriodEnd: { type: Date, default: null },
      activatedAt: { type: Date, default: null },
    },
    // Lets an admin disable an account (abuse, chargeback, etc.) without
    // deleting it. Checked on every login.
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'teachers',
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Case-insensitive uniqueness on email (values are already lowercased by the
// schema + the zod validator before they ever reach here).
teacherSchema.index({ email: 1 }, { unique: true });

module.exports = model('Teacher', teacherSchema);
