const { TaskTemplate } = require('../models');
const { isValidObjectId } = require('../utils/objectId');

function findAllByTeacher(teacherId) {
  return TaskTemplate.find({ teacher: teacherId }).sort({ createdAt: -1 });
}

function findById(id) {
  if (!isValidObjectId(id)) return null;
  return TaskTemplate.findById(id);
}

function create(data) {
  return TaskTemplate.create(data);
}

function deleteById(id) {
  if (!isValidObjectId(id)) return null;
  return TaskTemplate.findByIdAndDelete(id);
}

module.exports = {
  findAllByTeacher,
  findById,
  create,
  deleteById,
};
