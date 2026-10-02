const db = require("../db/database");
const { isValidEmail, isValidPhone, isNonEmptyString } = require("../utils/validators");
const { ApiError } = require("../middleware/errorMiddleware");

async function submitContactMessage(req, res) {
  const { name, email, phone, subject, message } = req.body || {};

  if (!isNonEmptyString(name, 2)) throw new ApiError(400, "Please provide your full name.");
  if (!isValidEmail(email)) throw new ApiError(400, "Please provide a valid email address.");
  if (!isValidPhone(phone)) throw new ApiError(400, "Please provide a valid 10-digit phone number.");
  if (!isNonEmptyString(subject, 1)) throw new ApiError(400, "Subject is required.");
  if (!isNonEmptyString(message, 10)) throw new ApiError(400, "Please give us a little more detail in your message.");

  db.prepare(
    "INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)"
  ).run(name.trim(), email.trim().toLowerCase(), phone.trim(), subject.trim(), message.trim());

  res.status(201).json({ success: true, message: "Thanks — your message was saved successfully." });
}

module.exports = { submitContactMessage };
