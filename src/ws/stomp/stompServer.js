const crypto = require('crypto');
const sockjs = require('sockjs');
const { match } = require('path-to-regexp');
const { splitFrames, parseFrame, buildFrame } = require('./frame');
const logger = require('../../utils/logger');

// Minimal STOMP-over-SockJS broker. Equivalent of:
//  - config/WebSocketConfig.java (registers /ws-devroom, /topic broker, /app prefix)
//  - Spring's SimpMessagingTemplate (the send() method below)
//  - the @MessageMapping dispatch performed by Spring for /app/** destinations
class StompServer {
  constructor() {
    this.connections = new Map(); // sessionId -> { conn, subscriptions: Map<subId, destination> }
    this.appHandlers = []; // [{ matcher, handler }]
    this.connectListeners = [];
    this.disconnectListeners = [];
  }

  /** Register a handler for SEND frames whose destination matches `pattern`, e.g. '/app/stream/:roomCode/:participantId' */
  onAppDestination(pattern, handler) {
    this.appHandlers.push({ matcher: match(pattern, { decode: decodeURIComponent }), handler });
  }

  onConnect(fn) {
    this.connectListeners.push(fn);
  }

  onDisconnect(fn) {
    this.disconnectListeners.push(fn);
  }

  attach(httpServer, { path }) {
    const sockjsServer = sockjs.createServer({
      prefix: path,
      log: (severity, message) => logger.debug(`[sockjs:${severity}] ${message}`),
      // Exclude iframe-based transports so we don't need a public sockjs_url.
      transports: ['websocket', 'xhr-streaming', 'xhr-polling', 'eventsource'],
    });

    sockjsServer.on('connection', (conn) => this._handleConnection(conn));
    sockjsServer.installHandlers(httpServer);

    logger.info(`STOMP-over-SockJS endpoint mounted at ${path}`);
  }

  _handleConnection(conn) {
    const sessionId = crypto.randomUUID();
    const state = { conn, subscriptions: new Map() };
    this.connections.set(sessionId, state);

    conn.on('data', (message) => {
      for (const raw of splitFrames(message)) {
        try {
          this._handleFrame(sessionId, parseFrame(raw));
        } catch (err) {
          logger.error('Error handling STOMP frame:', err);
        }
      }
    });

    conn.on('close', () => {
      this.connections.delete(sessionId);
      this.disconnectListeners.forEach((fn) => fn(sessionId));
    });
  }

  _handleFrame(sessionId, frame) {
    const state = this.connections.get(sessionId);
    if (!state) return;

    switch (frame.command) {
      case 'CONNECT':
      case 'STOMP':
        state.conn.write(
          buildFrame('CONNECTED', { version: '1.2', 'heart-beat': '0,0', session: sessionId })
        );
        logger.info(`WebSocket connected: sessionId=${sessionId}`);
        this.connectListeners.forEach((fn) => fn(sessionId));
        break;

      case 'SUBSCRIBE':
        if (frame.headers.id && frame.headers.destination) {
          state.subscriptions.set(frame.headers.id, frame.headers.destination);
        }
        break;

      case 'UNSUBSCRIBE':
        state.subscriptions.delete(frame.headers.id);
        break;

      case 'SEND':
        this._routeSend(sessionId, frame);
        break;

      case 'DISCONNECT':
        if (frame.headers.receipt) {
          state.conn.write(buildFrame('RECEIPT', { 'receipt-id': frame.headers.receipt }));
        }
        state.conn.close();
        break;

      default:
        // Unknown command or bare heart-beat frame - ignore.
        break;
    }
  }

  _routeSend(sessionId, frame) {
    const { destination } = frame.headers;
    if (!destination) return;

    const match_ = this.appHandlers.find(({ matcher }) => matcher(destination));
    if (!match_) {
      logger.warn(`No STOMP handler registered for destination: ${destination}`);
      return;
    }

    const result = match_.matcher(destination);
    Promise.resolve(
      match_.handler({
        params: result.params,
        body: frame.body,
        headers: frame.headers,
        sessionId,
      })
    ).catch((err) => logger.error(`Error in STOMP handler for ${destination}:`, err));
  }

  /** Equivalent of SimpMessagingTemplate#convertAndSend(destination, payload) */
  send(destination, body) {
    for (const state of this.connections.values()) {
      for (const [subId, dest] of state.subscriptions.entries()) {
        if (dest === destination) {
          state.conn.write(
            buildFrame(
              'MESSAGE',
              {
                destination,
                subscription: subId,
                'message-id': `${Date.now()}-${crypto.randomUUID()}`,
                'content-type': 'text/plain',
              },
              body
            )
          );
        }
      }
    }
  }
}

module.exports = StompServer;
