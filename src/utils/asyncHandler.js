// Express 4 does not forward rejected promises to the error middleware on its
// own - this wraps async controller/handler functions so thrown errors reach
// errorHandler.js instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
