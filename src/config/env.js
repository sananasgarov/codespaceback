require('dotenv').config();

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const env = {
  port: toInt(process.env.PORT, 8080),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  db: {
    uri: process.env.MONGODB_URI,
    logging: toBool(process.env.DB_LOGGING, false),
  },

  ws: {
    path: process.env.WS_PATH || '/ws-devroom',
  },

  execution: {
    timeoutSeconds: toInt(process.env.EXEC_TIMEOUT_SECONDS, 10),
    memoryLimitMb: toInt(process.env.EXEC_MEMORY_LIMIT_MB, 128),
    maxConcurrentContainers: toInt(process.env.EXEC_MAX_CONCURRENT_CONTAINERS, 5),
    queueWaitSeconds: toInt(process.env.EXEC_QUEUE_WAIT_SECONDS, 30),
  },
};

module.exports = env;
