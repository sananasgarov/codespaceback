const taskTemplateService = require('../services/taskTemplate.service');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

async function list(req, res) {
  const data = await taskTemplateService.listTemplates(req.teacher.id);
  res.status(200).json(
    apiResponse({ success: true, message: 'Task templates fetched successfully', data })
  );
}

async function create(req, res) {
  logger.info(`API Call: Teacher ${req.teacher.email} saving a task template`);
  const data = await taskTemplateService.createTemplate(req.teacher.id, req.body);
  res.status(201).json(
    apiResponse({ success: true, message: 'Task template saved', data })
  );
}

async function remove(req, res) {
  await taskTemplateService.deleteTemplate(req.params.templateId, req.teacher.id);
  res.status(200).json(
    apiResponse({ success: true, message: 'Task template deleted', data: null })
  );
}

module.exports = { list, create, remove };
