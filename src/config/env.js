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

  // Teacher auth (JWT). Secret is required - see utils/jwt.js, which fails
  // fast on boot rather than letting the app run with a guessable/empty key.
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // How long a newly registered teacher can create rooms for free.
  trialDays: toInt(process.env.TRIAL_DAYS, 7),

  // Shared secret for the internal/admin-only billing endpoints (manually
  // activating a teacher's subscription while no real payment gateway is
  // wired up). Left unset -> those endpoints stay locked (see middleware/adminAuth.js).
  adminKey: process.env.ADMIN_KEY || '',

  // Placeholder pricing shown to teachers once their trial ends. No payment
  // gateway is connected yet (POST /billing/subscribe intentionally returns
  // 503) - these values only drive the "upgrade" messaging until real
  // pricing/a real gateway is decided.
  billing: {
    currency: process.env.BILLING_CURRENCY || 'AZN',
    // Stored as minor units (qəpik) to avoid floating point issues.
    priceMinor: toInt(process.env.BILLING_PRICE_MINOR, 999),
    periodDays: toInt(process.env.BILLING_PERIOD_DAYS, 30),
  },
};

module.exports = env;
