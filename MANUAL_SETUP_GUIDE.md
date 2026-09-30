# Manual Setup Guide

This explains exactly what was created, what was changed in your existing
frontend, and how to run/test everything yourself. Nothing here should
require guessing — every change is shown with the surrounding context.

## 1. What was created (new files/folders)

```
backend/                          <- entire folder is new
  server.js
  package.json
  .env.example
  .gitignore
  database/
    schema.sql
    seed.js
    init.js
    csk_data.json                 <- your data.js foods, exported to JSON for seeding
    database.sqlite               <- created when you run db:init (not shipped in the zip)
  db/database.js
  routes/          (5 files)
  controllers/      (5 files)
  middleware/       (3 files)
  utils/            (6 files)

ceylon spice kitchen/config.js    <- new: sets the API base URL

README.md                         <- rewritten
API_DOCUMENTATION.md              <- new
MANUAL_SETUP_GUIDE.md             <- this file
PROJECT_CHALLENGES.md             <- new: every real issue hit, and how it was fixed
```

## 2. What was modified in your existing frontend

Only two files were touched, and only in specific places. The layout, CSS,
routing, cart behaviour, and every page's HTML output are unchanged.

### FILE: `ceylon spice kitchen/index.html`
**CHANGE:** added one `<script>` tag so `config.js` loads before `app.js`.
```html
<!-- before -->
<script src="data.js"></script>
<script src="app.js"></script>

<!-- after -->
<script src="config.js"></script>
<script src="data.js"></script>
<script src="app.js"></script>
```

### FILE: `ceylon spice kitchen/app.js`
Nine small, targeted changes. All of them replace a `localStorage`-only
action with a call to the backend, while keeping the same function names,
same DOM structure, and same `toast(...)` messages people already see.

1. **Added near the top** (right after `const D = window.CSK_DATA;`): an
   `apiFetch()` helper, plus `syncMenuFromBackend()` and
   `syncMyOrdersFromBackend()` — see the code comments in `app.js` for what
   each one does.
2. **`bindLogin()`** — now calls `POST /api/auth/login` instead of checking
   `users()` in local storage. Stores the returned token in
   `localStorage['restaurant_auth_token']` and the returned user in
   `restaurant_current_user` (same key as before, so the header/avatar/etc.
   all keep working unchanged).
3. **`bindSignup()`** — now calls `POST /api/auth/register`. It also
   logs the person in immediately (stores the token) and sends them to the
   homepage, instead of the old behaviour of redirecting to `/login` with no
   session. This is a deliberate small UX improvement enabled by the backend
   returning a token on registration — see `PROJECT_CHALLENGES.md` if you'd
   rather keep the old "create account, then log in separately" flow.
4. **Logout handler** (inside `bindCommon()`) — now also removes
   `restaurant_auth_token`, so a stale token can't linger after logout.
5. **`bindCheckout()`'s submit handler** — now requires the person to be
   logged in (the backend's `POST /api/orders` requires auth — see
   `PROJECT_CHALLENGES.md`), builds an order payload with only
   `foodId`/`quantity`/`spiceLevel`/`addons` per item (no prices — the
   backend calculates those), and POSTs to `/api/orders`. The order object
   saved locally (for the success/My Orders pages) is built from the
   **backend's response**, not the browser's own math.
6. **`bindContact()`** — now POSTs to `/api/contact` instead of writing to
   `restaurant_contact_messages`.
7. **Newsletter handler** (inside `bindPage()`) — now POSTs to
   `/api/newsletter` instead of writing to `restaurant_newsletter_subscribers`.
8. **`bindPage()`** — one line added: when the route is `/my-orders`, calls
   `syncMyOrdersFromBackend()` to refresh the page with real database orders.
9. **Startup** (`DOMContentLoaded` listener at the bottom) — now also calls
   `syncMenuFromBackend()` once, so the menu silently upgrades from
   `data.js` to live database data after the first paint.

**Not changed:** the cart itself is still `localStorage`-based (per the
brief's own instruction that this is fine — see section 31), the whole
hash-based router, every page's HTML/CSS, and all the validation messages.

## 3. Do I need to change `API_BASE_URL`?

Only if you're not using the default local setup. It lives in the new
`ceylon spice kitchen/config.js` file:
```js
window.CSK_API_BASE = (function () {
  if (location.port === "3000") return "/api";        // frontend served BY the backend
  return "http://localhost:3000/api";                  // frontend served separately
})();
```
- If you use the "backend serves the frontend too" setup (recommended, see
  §6 below), you don't need to change anything.
- If you deploy the backend somewhere else (a cloud host), change the second
  line's URL to that host's address, e.g. `"https://your-app.onrender.com/api"`.

## 4. Do I need to change CORS settings?

Only if your frontend runs on a different port than `.env`'s `FRONTEND_URL`
expects. Default `.env.example`:
```
FRONTEND_URL=http://localhost:5500
```
If you serve the frontend with, say, VS Code's Live Server on a different
port, update this value (see §6 for the exact commands either way).

## 5. Installing dependencies

```
cd backend
npm install
```
This will finish instantly with **"up to date, audited 1 package"** or
similar — the project has zero external dependencies (see
`PROJECT_CHALLENGES.md`, Problem 1, for exactly why, and how to swap in the
literal `express`/`bcryptjs`/`jsonwebtoken`/`cors`/`dotenv` packages if your
assignment specifically requires them).

**Requirement:** Node.js **22.5 or newer** (for the built-in `node:sqlite`
module). Check with `node -v`. If you're on an older Node, see "Swapping in
the original npm packages" below — installing `better-sqlite3` from npm
removes the version-22 requirement.

## 6. Running everything

**Option A — one process serves both frontend and backend (simplest):**
```
cd backend
npm install
cp .env.example .env      # (Windows: copy .env.example .env)
npm run db:init
npm run db:seed
npm start
```
The `.env` file isn't strictly required — every variable has a sensible
default baked into the code — but it's good practice and lets you change
`JWT_SECRET` to something private before you ever deploy this for real.
Then open **http://localhost:3000/** — that's the whole app, frontend and
API together. This works because `server.js` serves the `ceylon spice
kitchen/` folder (which must sit next to `backend/`, as it already does in
this delivery) for any request that isn't `/api/*`.

**Option B — frontend and backend as two separate servers** (closer to a
typical local dev setup):

Terminal 1:
```
cd backend
npm install
npm run db:init
npm run db:seed
npm run dev          # auto-restarts on file changes (uses Node's built-in --watch)
```
Terminal 2 — serve the frontend folder with any static file server, e.g.:
```
cd "ceylon spice kitchen"
npx --yes serve -l 5500
```
(or VS Code's "Live Server" extension, pointed at that folder). **Don't**
just double-click `index.html` — opening it as a `file://` URL will cause
the API requests to be blocked by the browser's CORS rules for local files.

Then open **http://localhost:5500/**.

## 7. Initializing & seeding SQLite

```
npm run db:init     # creates backend/database/database.sqlite with all 6 tables (safe to re-run)
npm run db:seed      # imports all 43 foods from data.js (safe to re-run — updates, doesn't duplicate)
```
**Should `database.sqlite` be committed to GitHub?** No — it's already in
`.gitignore`. Anyone who clones the repo runs the two commands above to
generate their own local copy. This also means each environment (your
laptop, a classmate's, a grader's) starts from the same known-good seed data.

## 8. Testing each API

See `API_DOCUMENTATION.md` for every endpoint's exact request/response shape.
Quick Postman-free smoke test with `curl` (server must be running):
```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","phone":"0771234567","password":"password123"}'
# copy the "token" value from the response, then:

curl http://localhost:3000/api/auth/me -H "Authorization: Bearer PASTE_TOKEN_HERE"
curl "http://localhost:3000/api/menu?category=Kottu"
curl http://localhost:3000/api/menu/chicken-kottu
```

**Using Postman instead:** create a new request, set the method/URL from the
table in `API_DOCUMENTATION.md`, set `Content-Type: application/json` under
Headers for any POST, paste the example JSON body under Body → raw → JSON,
and for authenticated routes add `Authorization: Bearer <token>` under
Headers (paste the token you got back from `/api/auth/login`).

## 9. Creating a user & placing a test order (through the UI)

1. Run the server (Option A above is simplest) and open `http://localhost:3000/`.
2. Go to **Sign Up**, fill the form, submit — you're logged in immediately.
3. Go to **Menu**, click **Add to Cart** on a couple of dishes.
4. Go to **Cart** → **Proceed to Checkout**.
5. Fill in phone, city (required even for Pickup — see `PROJECT_CHALLENGES.md`
   Problem 4), pick Delivery or Pickup, click **Place Order**.
6. You land on **Order Success** with the backend-calculated total. Go to
   **My Orders** to see it listed from the database.

## 10. Inspecting the SQLite database

- **DB Browser for SQLite** (GUI, free): open
  `backend/database/database.sqlite` in it directly. All 6 tables (`users`,
  `foods`, `orders`, `order_items`, `contact_messages`,
  `newsletter_subscribers`) are visible under the "Browse Data" tab.
- **Command line** (`sqlite3`, if installed):
  ```
  sqlite3 backend/database/database.sqlite
  .tables
  SELECT * FROM foods LIMIT 5;
  SELECT * FROM orders;
  .quit
  ```
- **From Node**, if you don't have the `sqlite3` CLI installed:
  ```
  node -e "const db=require('./backend/db/database.js'); console.log(db.prepare('SELECT * FROM foods LIMIT 5').all())"
  ```

## 11. Cloud / deployment notes

- The server reads `PORT`, `JWT_SECRET`, and `FRONTEND_URL` from environment
  variables (via `.env` locally, or your host's real env var settings in
  production) — nothing is hard-coded.
- **SQLite is file-based.** If you deploy to a platform with **ephemeral**
  storage (e.g. most default configurations of Render, Railway, Heroku,
  Vercel serverless functions), `database.sqlite` will be **wiped on every
  redeploy or restart**. Before deploying for real, check whether your
  platform offers a **persistent disk/volume** you can mount
  `backend/database/` onto (Render and Railway both offer this as an add-on;
  Heroku's filesystem is always ephemeral). If it doesn't, you'd need to
  either attach a persistent volume or switch to a hosted database — this
  backend does not silently pretend SQLite is safe everywhere.

## 12. Swapping in the original npm packages (optional)

If your course specifically requires `express`/`bcryptjs`/`jsonwebtoken`/
`cors`/`dotenv`/`better-sqlite3` to literally appear in `node_modules`, here's
the short version (once you have internet access where you run this):

```
cd backend
npm install express cors dotenv bcryptjs jsonwebtoken better-sqlite3
```
Then:
- `db/database.js`: replace `const { DatabaseSync } = require("node:sqlite");`
  / `new DatabaseSync(DB_PATH)` with `const Database = require("better-sqlite3");`
  / `new Database(DB_PATH)` — everything else (`.prepare().run/get/all()`)
  stays the same.
- `utils/password.js`: replace the `scrypt` functions with
  `bcrypt.hashSync(pw, 10)` / `bcrypt.compareSync(pw, hash)`.
- `utils/jwt.js`: replace `sign`/`verify` with `jwt.sign(payload, secret, {expiresIn})`
  / `jwt.verify(token, secret)`.
- `server.js` / `utils/router.js`: replace the custom `Router` with a real
  `express()` app; each route's `(req, res)` handler signature is already
  Express-compatible, so the routes/controllers files barely change.
- `middleware/corsMiddleware.js`: replace with `app.use(require("cors")({ origin: process.env.FRONTEND_URL }))`.
- `utils/loadEnv.js`: replace the call in `server.js` with `require("dotenv").config()`.

## 13. Version control

Your existing `.git` repository (found inside `ceylon spice kitchen/`) was
left exactly where it was — not moved, not reinitialized. All the new
`backend/` files and the four new docs at the project root are **not yet
tracked** by that repo (it's rooted one folder down). Suggested commit
sequence once you're ready:
```
git add ../backend ../README.md ../API_DOCUMENTATION.md ../MANUAL_SETUP_GUIDE.md ../PROJECT_CHALLENGES.md
# (run from inside "ceylon spice kitchen/", or move the .git folder to the
#  project root first if you'd rather track everything from one place)
git commit -m "Set up Node.js backend"
git add app.js index.html config.js
git commit -m "Integrate frontend with backend API"
```
Or, if you'd prefer one `.git` at the project root instead: move
`ceylon spice kitchen/.git` up to the project root, then `git add` everything
and adjust `.gitignore` paths accordingly (the provided `backend/.gitignore`
already excludes `node_modules/`, `.env`, and `database.sqlite`).

## 14. Testing performed before delivery

Everything below was actually executed against a running server (not just
written and assumed to work):

- `npm run db:init` then `npm run db:seed` **twice** — confirmed 43 foods
  each time, no duplicates on the second run.
- `curl`-tested: health check; register; duplicate register (409); login
  with wrong password (401); `/me` with no token (401), with a garbage
  token (401), and with a real token (200); menu list, category filter,
  search, categories, single food, unknown food (404); order creation with a
  **tampered `unitPrice` in the request** (confirmed the response uses the
  real database price, not the tampered one); order with quantity 0 (400);
  negative quantity (400); nonexistent food (404); missing delivery address
  (400); below delivery minimum (400); invalid order type (400); a second
  user attempting to view the first user's order (403); a nonexistent order
  id (404); contact form valid + invalid email (201/400); newsletter
  subscribe, duplicate subscribe, invalid email (201/200/400); CORS preflight
  and actual-request headers; static file serving of `index.html`, `app.js`,
  and an image under `/assets/`.
- Confirmed the server **stays running** (doesn't crash) through every
  invalid-input case above — this caught the router bug described in
  `PROJECT_CHALLENGES.md` Problem 2.
- **Full browser test with Playwright** (headless Chromium): sign up → menu
  page renders real backend data → add to cart → checkout as Pickup → land
  on Order Success with the backend-calculated total → My Orders page shows
  the order pulled from `GET /api/orders/my` → log out → log back in → submit
  the Contact form → submit the Newsletter form. Zero JavaScript console
  errors throughout. Verified the contact message and newsletter subscriber
  actually landed in `database.sqlite` afterwards.
