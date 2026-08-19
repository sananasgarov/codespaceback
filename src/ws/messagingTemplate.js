const logger = require('../utils/logger');

// Equivalent of Spring's SimpMessagingTemplate - a broker-agnostic facade the
// rest of the app uses to broadcast to STOMP topics. The actual broker
// instance is wired in by ws/socket.js at startup (init()).
let broker = null;

function init(stompServer) {
  broker = stompServer;
}

function convertAndSend(destination, body) {
  if (!broker) {
    logger.warn(`Message broker not initialized yet, dropped message to ${destination}`);
    return;
  }
  broker.send(destination, body);
}

module.exports = { init, convertAndSend };
