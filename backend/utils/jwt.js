// utils/jwt.js
//
// A small, standards-compliant HS256 JWT implementation using only Node's
// built-in `crypto` module (no internet access was available to install the
// `jsonwebtoken` npm package while building this project — see
// MANUAL_SETUP_GUIDE.md). The tokens produced are REAL JWTs: three
// base64url segments (header.payload.signature), HMAC-SHA256 signed. You can
// paste one into jwt.io and it will decode normally.
//
// If your course requires the literal `jsonwebtoken` package, swap this file
// for calls to `jwt.sign(...)` / `jwt.verify(...)` — the function signatures
// below were deliberately kept close to that package's API.

const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function sign(payload, secret, { expiresInSeconds = 60 * 60 * 24 * 7 } = {}) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Returns the decoded payload, or throws an Error with a short message.
function verify(token, secret) {
  if (typeof token !== "string" || token.split(".").length !== 3) {
    throw new Error("Malformed token");
  }
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Token expired");
  }
  return payload;
}

module.exports = { sign, verify };
