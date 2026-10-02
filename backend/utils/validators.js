
function isValidEmail(email) {
  return typeof email === "string" && /^\S+@\S+\.\S+$/.test(email.trim());
}

// Matches the existing frontend's rule: local Sri Lankan mobile format, e.g. 0771234567
function isValidPhone(phone) {
  if (typeof phone !== "string") return false;
  return /^0\d{9}$/.test(phone.replace(/\s+/g, ""));
}

function isNonEmptyString(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

module.exports = { isValidEmail, isValidPhone, isNonEmptyString };
