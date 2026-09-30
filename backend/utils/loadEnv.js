// utils/loadEnv.js
//
// A ~15-line replacement for the `dotenv` npm package (no internet access
// was available to install it while building this project — see
// MANUAL_SETUP_GUIDE.md). Reads backend/.env and copies KEY=VALUE lines into
// process.env, same as dotenv's default behaviour. Does not overwrite a
// variable that's already set in the real environment (e.g. on a cloud host).

const fs = require("fs");
const path = require("path");

module.exports = function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip matching surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
};
