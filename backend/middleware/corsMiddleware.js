// middleware/corsMiddleware.js
//
// Manual CORS handling (no `cors` npm package — see MANUAL_SETUP_GUIDE.md).
// Reads the allowed origin from process.env.FRONTEND_URL.

function corsMiddleware(frontendUrl) {
  return function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", frontendUrl || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    next();
  };
}

module.exports = corsMiddleware;
