// db/database.js
//
// This project uses Node's BUILT-IN `node:sqlite` module instead of the
// `better-sqlite3` npm package. See MANUAL_SETUP_GUIDE.md -> "Why node:sqlite
// instead of better-sqlite3" for the full explanation. The API is almost
// identical (db.prepare(sql).run/get/all(...params)), so the rest of the
// codebase reads exactly like a normal better-sqlite3 project.
//
// Requires Node.js 22.5+ (uses the stable-enough `node:sqlite` module).

const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "..", "database", "database.sqlite");
const SCHEMA_PATH = path.join(__dirname, "..", "database", "schema.sql");

const db = new DatabaseSync(DB_PATH);

// Enable foreign key enforcement (off by default in SQLite).
db.exec("PRAGMA foreign_keys = ON;");

// Initialize schema (safe to run every time the server starts — uses
// CREATE TABLE IF NOT EXISTS, so it never wipes existing data).
function initSchema() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
}

initSchema();

module.exports = db;
