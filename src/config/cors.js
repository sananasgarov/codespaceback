const env = require('./env');

// Mirrors the original Spring Boot CorsConfig: allow the frontend origin(s),
// all headers, the standard REST verbs, and credentials (cookies/auth headers).
const corsOptions = {
  origin: env.corsOrigin,
  allowedHeaders: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

module.exports = corsOptions;
