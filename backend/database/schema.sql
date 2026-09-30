-- Ceylon Spice Kitchen — SQLite schema
-- Run automatically by db/database.js on server startup (CREATE TABLE IF NOT EXISTS).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL,
  description      TEXT NOT NULL,
  full_description TEXT NOT NULL,
  image            TEXT NOT NULL,
  price            INTEGER NOT NULL,
  rating           REAL NOT NULL DEFAULT 0,
  prep_time        INTEGER NOT NULL DEFAULT 0,
  spice_level      TEXT NOT NULL DEFAULT 'Mild',
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  popular          INTEGER NOT NULL DEFAULT 0,
  available        INTEGER NOT NULL DEFAULT 1,
  customizable     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  order_number   TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type     TEXT NOT NULL CHECK (order_type IN ('Delivery','Pickup')),
  address        TEXT,
  city           TEXT,
  note           TEXT,
  payment_method TEXT NOT NULL,
  subtotal       INTEGER NOT NULL,
  delivery_fee   INTEGER NOT NULL DEFAULT 0,
  discount       INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Confirmed',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_id      TEXT REFERENCES foods(id),
  food_name    TEXT NOT NULL,
  unit_price   INTEGER NOT NULL,
  quantity     INTEGER NOT NULL,
  spice_level  TEXT,
  addons_json  TEXT NOT NULL DEFAULT '[]',
  subtotal     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addons (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL,
  available   INTEGER NOT NULL DEFAULT 1
);
