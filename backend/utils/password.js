// utils/password.js
//
// Password hashing without the `bcryptjs` npm package (no internet access
// was available to install it while building this project — see
// MANUAL_SETUP_GUIDE.md). Instead we use Node's built-in `crypto.scrypt`,
// which is a well-regarded, slow, salted hashing algorithm designed for
// exactly this purpose (Node's own docs recommend it for password storage).
//
// Stored format: "scrypt:<salt-hex>:<hash-hex>"
// This is never returned to the client and is never logged.

const crypto = require("crypto");

const KEY_LENGTH = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("scrypt:")) return false;
  const [, salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

module.exports = { hashPassword, verifyPassword };
