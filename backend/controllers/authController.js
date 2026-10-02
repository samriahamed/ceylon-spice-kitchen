const db = require("../db/database");
const { hashPassword, verifyPassword } = require("../utils/password");
const jwt = require("../utils/jwt");
const { JWT_SECRET } = require("../middleware/authMiddleware");
const { isValidEmail, isValidPhone, isNonEmptyString } = require("../utils/validators");
const { ApiError } = require("../middleware/errorMiddleware");

function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
  };
}

async function register(req, res) {
  const { fullName, email, phone, password } = req.body || {};

  if (!isNonEmptyString(fullName, 2)) throw new ApiError(400, "Please provide your full name.");
  if (!isValidEmail(email)) throw new ApiError(400, "Please provide a valid email address.");
  if (!isValidPhone(phone)) throw new ApiError(400, "Please provide a valid 10-digit phone number (e.g. 0771234567).");
  if (typeof password !== "string" || password.length < 6) throw new ApiError(400, "Password must be at least 6 characters.");

  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) throw new ApiError(409, "An account with this email already exists.");

  const passwordHash = hashPassword(password);
  const info = db
    .prepare(
      "INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)"
    )
    .run(fullName.trim(), normalizedEmail, phone.trim(), passwordHash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    token,
    user: toPublicUser(user),
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== "string" || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, "Email or password is incorrect.");
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: toPublicUser(user),
  });
}

async function me(req, res) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ success: true, user: toPublicUser(user) });
}

module.exports = { register, login, me };
