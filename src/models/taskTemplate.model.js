const { Schema, model } = require('mongoose');

// A teacher's reusable task bank - saved once, reused across any room/lesson
// instead of retyping the same title+description every time (see
// room.model.js#currentTask, which is the single *active* task a template
// gets copied into via PATCH /rooms/:roomCode/task).
const taskTemplateSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
  },
  {
    collection: 'task_templates',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = model('TaskTemplate', taskTemplateSchema);
