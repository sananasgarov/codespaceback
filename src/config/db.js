const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);
if (env.db.logging) {
  mongoose.set('debug', (collectionName, method, ...args) => {
    logger.debug(`[mongoose] ${collectionName}.${method}`, ...args);
  });
}

async function connectDatabase() {
  if (!env.db.uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy your MongoDB Atlas connection string into codespaceback/.env'
    );
  }

  await mongoose.connect(env.db.uri);
  logger.info('Database connection established (MongoDB)');
}

module.exports = { mongoose, connectDatabase };
