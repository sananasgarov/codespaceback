const authService = require('../services/auth.service');
const { apiResponse } = require('../dto/response/apiResponse');
const logger = require('../utils/logger');

// Equivalent of controller/AuthController.java

async function register(req, res) {
  logger.info(`API Call: Register request for email: ${req.body.email}`);

  const data = await authService.register(req.body);

  res.status(201).json(
    apiResponse({ success: true, message: 'Account created successfully', data })
  );
}

async function login(req, res) {
  logger.info(`API Call: Login request for email: ${req.body.email}`);

  const data = await authService.login(req.body);

  res.status(200).json(
    apiResponse({ success: true, message: 'Login successful', data })
  );
}

async function me(req, res) {
  const data = await authService.getProfile(req.teacher);

  res.status(200).json(
    apiResponse({ success: true, message: 'Profile fetched successfully', data })
  );
}

module.exports = { register, login, me };
