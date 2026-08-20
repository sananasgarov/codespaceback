const taskTemplateRepository = require('../repositories/taskTemplate.repository');
const taskTemplateMapper = require('../mappers/taskTemplate.mapper');
const TaskTemplateNotFoundException = require('../errors/TaskTemplateNotFoundException');
const ForbiddenException = require('../errors/ForbiddenException');
const logger = require('../utils/logger');

// A teacher's reusable task bank - lets TaskDialog on the frontend offer
// "pick from saved tasks" instead of retyping title+description every
// lesson. Scoped per-teacher (not per-room), same as rooms/mine.

async function listTemplates(teacherId) {
  const templates = await taskTemplateRepository.findAllByTeacher(teacherId);
  return taskTemplateMapper.toResponseList(templates);
}

async function createTemplate(teacherId, { title, description }) {
  logger.info(`Teacher ${teacherId} saving a task template: "${title}"`);
  const template = await taskTemplateRepository.create({
    title,
    description: description || '',
    teacher: teacherId,
  });
  return taskTemplateMapper.toResponse(template);
}

async function deleteTemplate(templateId, teacherId) {
  const template = await taskTemplateRepository.findById(templateId);
  if (!template) {
    throw new TaskTemplateNotFoundException(templateId);
  }
  if (String(template.teacher) !== String(teacherId)) {
    logger.warn(`Forbidden: teacher ${teacherId} attempted to delete task template ${templateId} they do not own`);
    throw new ForbiddenException('You can only manage your own task templates');
  }

  await taskTemplateRepository.deleteById(templateId);
  logger.info(`Task template ${templateId} deleted by teacher ${teacherId}`);
}

module.exports = {
  listTemplates,
  createTemplate,
  deleteTemplate,
};
