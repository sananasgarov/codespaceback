const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const corsOptions = require('./config/cors');
const swaggerSpec = require('./swagger');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Equivalent of the Spring Boot application context wiring: CORS filter,
// controllers mounted under /api/v1/**, springdoc UI, and the global
// exception handler as the last middleware in the chain.
const app = express();

// Trust exactly one hop of X-Forwarded-For (the platform's own reverse
// proxy - Render/Vercel/etc, see README). Needed for express-rate-limit
// (middleware/rateLimit.js) to key off each real client IP instead of the
// proxy's IP for everyone; deliberately not `true` (unlimited hops), which
// would let a client spoof its own IP via the header. No-op locally, where
// there's no proxy in front and the header is simply absent.
app.set('trust proxy', 1);

// Standard secure headers (X-Content-Type-Options, HSTS, etc). CSP is left
// off the default config since this is a pure JSON API with a Swagger UI
// page, not something rendering untrusted HTML.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
// Bound the request body size - this is a small JSON API, nothing here
// legitimately needs a multi-megabyte payload.
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

app.use('/v3/api-docs', (req, res) => res.json(swaggerSpec));
app.use('/swagger-ui.html', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
