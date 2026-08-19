const StompServer = require('./stomp/stompServer');
const messagingTemplate = require('./messagingTemplate');
const { registerCodeStreamHandlers } = require('./handlers/codeStream.handler');
const { registerEventListeners } = require('./eventListener');
const env = require('../config/env');

// Equivalent of config/WebSocketConfig.java:
//  - SockJS endpoint at /ws-devroom
//  - simple broker prefix "/topic" (handled by StompServer#send)
//  - application destination prefix "/app" (handled by registered handlers)
function attachWebSocket(httpServer) {
  const stompServer = new StompServer();

  registerCodeStreamHandlers(stompServer);
  registerEventListeners(stompServer);

  stompServer.attach(httpServer, { path: env.ws.path });
  messagingTemplate.init(stompServer);

  return stompServer;
}

module.exports = { attachWebSocket };
