const bcrypt = require('bcryptjs');
const teacherRepository = require('../repositories/teacher.repository');
const teacherMapper = require('../mappers/teacher.mapper');
const billingService = require('./billing.service');
const { signToken } = require('../utils/jwt');
const ConflictException = require('../errors/ConflictException');
const UnauthorizedException = require('../errors/UnauthorizedException');
const ForbiddenException = require('../errors/ForbiddenException');
const env = require('../config/env');
const logger = require('../utils/logger');

// Equivalent of service/AuthService.java
const BCRYPT_COST = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function register({ name, email, password }) {
  logger.info(`Register attempt for email: ${email}`);

  const exists = await teacherRepository.existsByEmail(email);
  if (exists) {
    // Deliberately vague on *what* conflicts to avoid confirming account
    // existence beyond what registration already inherently reveals.
    logger.warn(`Register failed: email already registered (${email})`);
    throw new ConflictException('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + env.trialDays * 24 * 60 * 60 * 1000);

  const teacher = await teacherRepository.create({ name, email, passwordHash, trialEndsAt });

  logger.info(`Teacher registered: ${teacher.email} (trial ends ${trialEndsAt.toISOString()})`);
  return buildAuthResult(teacher);
}

async function login({ email, password }) {
  logger.info(`Login attempt for email: ${email}`);

  const teacher = await teacherRepository.findByEmail(email, { withSecrets: true });

  // Same generic message whether the email doesn't exist or the password is
  // wrong - never lets a caller enumerate registered emails.
  if (!teacher) {
    logger.warn(`Login failed: no account for email ${email}`);
    throw new UnauthorizedException('Invalid email or password');
  }

  if (!teacher.isActive) {
    logger.warn(`Login blocked: account disabled (${email})`);
    throw new ForbiddenException('This account has been disabled');
  }

  if (teacher.lockUntil && teacher.lockUntil > new Date()) {
    const minutesLeft = Math.ceil((teacher.lockUntil.getTime() - Date.now()) / 60000);
    logger.warn(`Login blocked: account temporarily locked (${email}), ${minutesLeft}m remaining`);
    throw new UnauthorizedException(`Too many failed attempts. Try again in ${minutesLeft} minute(s)`);
  }

  const passwordMatches = await bcrypt.compare(password, teacher.passwordHash);
  if (!passwordMatches) {
    await registerFailedAttempt(teacher);
    logger.warn(`Login failed: wrong password (${email})`);
    throw new UnauthorizedException('Invalid email or password');
  }

  teacher.failedLoginAttempts = 0;
  teacher.lockUntil = null;
  teacher.lastLoginAt = new Date();
  await teacherRepository.save(teacher);

  logger.info(`Login succeeded: ${email}`);
  return buildAuthResult(teacher);
}

async function registerFailedAttempt(teacher) {
  teacher.failedLoginAttempts = (teacher.failedLoginAttempts || 0) + 1;
  if (teacher.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    teacher.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    teacher.failedLoginAttempts = 0;
  }
  await teacherRepository.save(teacher);
}

function buildAuthResult(teacher) {
  return {
    token: signToken(teacher),
    teacher: teacherMapper.toResponse(teacher),
    access: billingService.getAccessStatus(teacher),
  };
}

async function getProfile(teacher) {
  return {
    teacher: teacherMapper.toResponse(teacher),
    access: billingService.getAccessStatus(teacher),
  };
}

module.exports = { register, login, getProfile };
