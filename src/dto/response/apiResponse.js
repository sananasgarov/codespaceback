// Equivalent of dto/response/ApiResponse.java - a consistent response envelope
// for every REST endpoint.
function apiResponse({ success, message, data }) {
  return {
    success,
    message,
    data: data === undefined ? null : data,
    timeStamp: new Date().toISOString(),
  };
}

module.exports = { apiResponse };
