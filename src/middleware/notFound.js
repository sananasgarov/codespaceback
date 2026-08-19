const { apiResponse } = require('../dto/response/apiResponse');

function notFound(req, res) {
  res.status(404).json(
    apiResponse({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
  );
}

module.exports = notFound;
