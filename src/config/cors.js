const env = require('./env');

// Mirrors the original Spring Boot CorsConfig: allow the frontend origin(s),
// the headers this API actually reads, the standard REST verbs, and
// credentials (cookies/auth headers). Headers are an explicit list rather
// than '*' - narrower attack surface for no loss of functionality, since
// every header the frontend sends is named here.
const corsOptions = {
  origin: env.corsOrigin,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

module.exports = corsOptions;
