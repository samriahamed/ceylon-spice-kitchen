# Ceylon Spice Kitchen

A Sri Lankan restaurant ordering app: an existing vanilla HTML/CSS/JS
frontend, now backed by a real Node.js REST API and SQLite database.

## Frontend
HTML · CSS · JavaScript (vanilla, hash-based routing, no build step)

## Backend
Node.js · REST API (built on Node's core `http` module — see
`PROJECT_CHALLENGES.md` for why `express` isn't a literal dependency here,
and how to swap it in)

## Database
SQLite, via Node's built-in `node:sqlite` module

## Authentication
Password hashing via `crypto.scrypt` + hand-rolled, standards-compliant
HS256 JWTs (see `PROJECT_CHALLENGES.md` for details)

## Features
- User registration & login
- Menu API with search, category, price-range filtering and sorting
- Food details API
- Shopping cart (client-side, persisted in `localStorage`)
- Checkout with **server-authoritative pricing** — the backend recalculates
  every price from the database; a tampered price sent by the browser is
  never trusted
- Order history (My Orders), scoped to the logged-in user
- Contact form → stored in SQLite
- Newsletter signup → stored in SQLite, duplicate-safe

## How to run

```
cd backend
npm install
cp .env.example .env
npm run db:init
npm run db:seed
npm start
```
Then open **http://localhost:3000/**.

That single command set serves both the API (`/api/*`) and the existing
frontend from one server. For a two-terminal setup (frontend and backend
separate), and for every other detail — what changed in your existing files,
CORS/API base URL, deployment notes, and the full test log — see
**`MANUAL_SETUP_GUIDE.md`**.

## More documentation

- **`API_DOCUMENTATION.md`** — every endpoint, request/response shapes, error codes.
- **`MANUAL_SETUP_GUIDE.md`** — exact setup steps, exactly what was changed
  and why, how to test, how to inspect the database, deployment notes.
- **`PROJECT_CHALLENGES.md`** — every real technical problem hit while
  building this, and how it was solved (read this if anything looks
  unfamiliar, like `node:sqlite` instead of `better-sqlite3`).

## Project structure

```
ceylon-spice-kitchen/
├── ceylon spice kitchen/     # existing frontend (unchanged except 2 files — see MANUAL_SETUP_GUIDE.md)
│   ├── index.html
│   ├── app.js
│   ├── data.js
│   ├── config.js             # new — points the frontend at the API
│   ├── styles.css
│   └── assets/
├── backend/                  # new
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── database/             # schema.sql, seed.js, init.js
│   ├── db/                   # database.js (SQLite connection)
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── utils/
├── README.md
├── API_DOCUMENTATION.md
├── MANUAL_SETUP_GUIDE.md
└── PROJECT_CHALLENGES.md
```
