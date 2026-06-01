const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
  };
  if (err.details) payload.details = err.details;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
