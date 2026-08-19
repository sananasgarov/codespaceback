const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase } = require('./models');
const { attachWebSocket } = require('./ws/socket');

// Equivalent of DevRoomApplication.java's main() - boots the DB connection,
// the HTTP/Express server, and the STOMP-over-SockJS realtime layer together.
async function start() {
  try {
    await connectDatabase();

    const server = http.createServer(app);
    attachWebSocket(server);

    server.listen(env.port, () => {
      logger.info(`DevRoom backend listening on port ${env.port}`);
      logger.info(`Swagger UI: http://localhost:${env.port}/swagger-ui.html`);
      logger.info(`WebSocket (STOMP/SockJS): ws://localhost:${env.port}${env.ws.path}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
