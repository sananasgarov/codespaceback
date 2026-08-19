const express = require('express');
const cors = require('cors');
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

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.use('/v3/api-docs', (req, res) => res.json(swaggerSpec));
app.use('/swagger-ui.html', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
