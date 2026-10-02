// A small typed error so controllers can `throw new ApiError(404, "Food not found")`
// and the central handler below turns it into the right HTTP response.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Registered once in server.js via router.setErrorHandler(...)
function errorHandler(err, req, res) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : "Internal server error";

  // Always log the real error server-side for debugging.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} ->`, err);

  if (res.writableEnded) return;
  res.status(statusCode).json({ success: false, message });
}

module.exports = { ApiError, errorHandler };
