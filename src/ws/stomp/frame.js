// Minimal STOMP 1.2 frame codec - just enough to talk to @stomp/stompjs +
// sockjs-client clients, which is what a Next.js frontend built against the
// original Spring STOMP endpoint (/ws-devroom) would use.
//
// Frame wire format:
//   COMMAND\n
//   header1:value1\n
//   header2:value2\n
//   \n
//   Body...\0
const NULL_BYTE = '\x00';

function unescapeHeaderValue(value) {
  return value.replace(/\\r|\\n|\\c|\\\\/g, (m) => {
    if (m === '\\r') return '\r';
    if (m === '\\n') return '\n';
    if (m === '\\c') return ':';
    return '\\';
  });
}

function escapeHeaderValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}

/**
 * Split a raw SockJS message (which may contain one or more NULL-terminated
 * STOMP frames, or a bare heart-beat newline) into individual raw frame chunks.
 */
function splitFrames(raw) {
  return raw
    .split(NULL_BYTE)
    .map((chunk) => chunk.replace(/^\n+/, '')) // drop leading heart-beat newlines
    .filter((chunk) => chunk.trim().length > 0);
}

/**
 * Parse one raw frame chunk (without the trailing NULL byte) into
 * { command, headers, body }.
 */
function parseFrame(raw) {
  const lines = raw.split('\n');
  const command = lines[0].trim();
  const headers = {};

  let i = 1;
  for (; i < lines.length; i += 1) {
    if (lines[i] === '') {
      i += 1;
      break;
    }
    const idx = lines[i].indexOf(':');
    if (idx > -1) {
      const key = lines[i].slice(0, idx);
      const value = unescapeHeaderValue(lines[i].slice(idx + 1));
      headers[key] = value;
    }
  }

  const body = lines.slice(i).join('\n');
  return { command, headers, body };
}

/**
 * Build a wire-ready STOMP frame string, NULL-terminated.
 */
function buildFrame(command, headers = {}, body = '') {
  let frame = `${command}\n`;
  for (const [key, value] of Object.entries(headers)) {
    frame += `${key}:${escapeHeaderValue(value)}\n`;
  }
  frame += `\n${body}${NULL_BYTE}`;
  return frame;
}

module.exports = { splitFrames, parseFrame, buildFrame };
