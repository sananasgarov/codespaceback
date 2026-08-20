const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const env = require('./config/env');

// Equivalent of the springdoc-openapi setup in the Java app
// (springdoc.swagger-ui.path=/swagger-ui.html, api-docs.path=/v3/api-docs)
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevRoom API',
      version: '1.0.0',
      description: 'Real-time collaborative code room backend',
    },
    servers: [{ url: `http://localhost:${env.port}` }],
  },
  // swagger-jsdoc's internal glob matching only understands forward slashes,
  // so path.join's backslashes on Windows silently made this match nothing
  // (pre-existing - not related to any route added here).
  apis: [path.join(__dirname, 'routes', '*.js').split(path.sep).join('/')],
});

module.exports = swaggerSpec;
