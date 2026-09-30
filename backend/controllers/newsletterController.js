// controllers/newsletterController.js
const db = require("../db/database");
const { isValidEmail } = require("../utils/validators");
const { ApiError } = require("../middleware/errorMiddleware");

async function subscribe(req, res) {
  const { email } = req.body || {};
  if (!isValidEmail(email)) throw new ApiError(400, "Please provide a valid email address.");

  const normalized = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM newsletter_subscribers WHERE email = ?").get(normalized);

  if (existing) {
    res.json({ success: true, message: "You're already subscribed — thanks for sticking around!" });
    return;
  }

  db.prepare("INSERT INTO newsletter_subscribers (email) VALUES (?)").run(normalized);
  res.status(201).json({ success: true, message: "You're subscribed. We'll keep updates occasional and useful." });
}

module.exports = { subscribe };
