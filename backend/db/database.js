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
