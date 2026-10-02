const jwt = require("../utils/jwt");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_secure_secret";

// Protects a route: requires "Authorization: Bearer <token>".
// On success, attaches req.user = { id, email }.
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ success: false, message: "Missing or invalid Authorization header. Expected: Bearer <token>" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = { requireAuth, JWT_SECRET };
