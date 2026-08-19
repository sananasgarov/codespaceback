// Small dependency-free logger mirroring the slf4j log.info/warn/error/debug
// calls used throughout the original Spring Boot services.
function timestamp() {
  return new Date().toISOString();
}

function format(level, args) {
  return [`[${timestamp()}] [${level}]`, ...args];
}

const logger = {
  info: (...args) => console.log(...format('INFO', args)),
  warn: (...args) => console.warn(...format('WARN', args)),
  error: (...args) => console.error(...format('ERROR', args)),
  debug: (...args) => {
    if (process.env.DEBUG_LOGS === 'true') {
      console.log(...format('DEBUG', args));
    }
  },
};

module.exports = logger;
