# Problems Encountered & How They Were Solved

Per the project brief's "do not hide problems" rule, this file lists every real
technical issue hit while building this backend, honestly, in the order they came up.

---

## PROBLEM 1 — No internet access in the build environment

**WHY IT HAPPENED:** The sandbox this backend was built in has outbound network
access disabled (confirmed: `npm install` / any request to `registry.npmjs.org`
returns `403 host_not_allowed`). The brief's recommended packages — `express`,
`cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`, `better-sqlite3` — could not be
downloaded, so they could not be installed *or tested* here.

**SOLUTION:** Rather than write untested code against packages I couldn't
actually run, the entire backend was built using **only Node.js's built-in
modules**:

| Instead of...     | This project uses...                          | Why it's a safe substitute |
|--------------------|------------------------------------------------|------------------------------|
| `express`          | `utils/router.js` — a ~140-line router built on `http` | Copies Express's everyday API (`app.get(path, handler)`, `req.params`, `req.query`, `res.status().json()`) so the rest of the code reads like a normal Express app. |
| `better-sqlite3`    | `node:sqlite` (`DatabaseSync`, built into Node 22.5+) | Nearly identical synchronous API (`db.prepare(sql).run/get/all(...)`). No native compilation step, which is a common source of "it won't install" pain with `better-sqlite3` on Windows/Mac student laptops. |
| `bcryptjs`          | `crypto.scrypt` (Node core, `utils/password.js`) | Node's own docs recommend `scrypt` for password hashing. Salted, slow, one-way — same security properties as bcrypt. |
| `jsonwebtoken`      | Hand-rolled HS256 signer (`utils/jwt.js`)       | Produces **real, standard JWTs** — header.payload.signature, HMAC-SHA256 — decodable on jwt.io. Same function shapes as the npm package. |
| `cors`              | A ~15-line middleware (`middleware/corsMiddleware.js`) | Just sets the three `Access-Control-Allow-*` headers the brief needs. |
| `dotenv`            | A ~20-line loader (`utils/loadEnv.js`)          | Reads `.env` into `process.env`, same default behaviour. |

**Result:** `package.json` has **zero dependencies**, and `npm install` in
`backend/` will succeed instantly (nothing to download) on any machine —
including yours, even without touching your network setup.

**MANUAL ACTION REQUIRED — none**, unless your assignment specifically requires
the *literal* npm packages to appear in `package.json`/`node_modules`. If so:
see "Swapping in the original npm packages" in `MANUAL_SETUP_GUIDE.md` — the
swap is small because the function signatures were deliberately kept close to
those packages' real APIs.

**Files affected:** `backend/package.json`, everything under `backend/utils/`
and `backend/middleware/`, `backend/db/database.js`.

---

## PROBLEM 2 — First version of the router crashed the server on validation errors

**WHY IT HAPPENED:** While testing `POST /api/orders` with a bad request (e.g.
`quantity: 0`), the server process **crashed** instead of returning a clean
400 response. Root cause: the router's handler-chaining code called the next
handler recursively from inside a plain (non-`async`) middleware's callback,
without the outer code ever awaiting that recursive call. When the
`async` controller further down the chain (`createOrder`) threw an
`ApiError`, that rejection had no `await`er and became an *unhandled promise
rejection*, which crashes a Node process by default.

**SOLUTION:** Rewrote `Router.handle()`'s handler-chaining loop (`utils/router.js`)
to wrap every handler call in `new Promise((resolve, reject) => ...)` and
explicitly `await` each step, the same pattern already used correctly for
global middleware. Now any thrown error — sync or async, from a middleware or
a controller — is caught by the router and handed to the central error
handler instead of crashing the process.

**Verified fixed by:** re-running the full validation test suite (bad
quantity, missing address, nonexistent food, wrong order type, etc.) — the
server now returns a proper `400`/`404` JSON response and **stays running**
for every case. See the "Testing performed" section of `MANUAL_SETUP_GUIDE.md`
for the exact commands used.

**Files affected:** `backend/utils/router.js`.

---

## PROBLEM 3 — `node:sqlite` is still an "experimental" Node API

**WHY IT HAPPENED:** `node:sqlite` was added recently and Node prints:
```
ExperimentalWarning: SQLite is an experimental feature and might change at any time
```
to the console every time the server starts. This is a **warning, not an
error** — the server runs correctly — but it looks alarming the first time
you see it.

**SOLUTION / MANUAL ACTION:** Nothing is required — it's safe to ignore. If
you want a completely quiet console, start the server with:
```
node --no-warnings server.js
```
This is already noted in the README's "How to run" section.

**Files affected:** none (informational only).

---

## PROBLEM 4 — Pre-existing frontend quirk found during testing (not something I introduced)

**WHY IT HAPPENED:** While running an automated browser test of the full
checkout flow, a **Pickup** order failed to submit. Investigating showed the
existing `bindCheckout()` validation in `app.js` (unchanged, original code)
requires the **City** field for every order type:
```js
if(!vals.city) er('city', 'City is required.');
```
even though the project brief (and the Pickup radio option's own copy,
"Collect from the restaurant") only requires city for **Delivery** orders.
This bug already existed in the frontend you provided — it is not something
the backend integration introduced.

**SOLUTION:** Left as-is. Per the brief's explicit instruction not to change
the frontend design/validation unnecessarily, this was **not** modified. The
backend's own validation is already correct (only requires `city` when
`orderType` is `Delivery` — see `backend/controllers/orderController.js`), so
this only affects the browser form, not data integrity.

**MANUAL ACTION REQUIRED (optional):** If you'd like Pickup orders to not
require a city, open `app.js`, find `bindCheckout()`, and change:
```js
if(!vals.city) er('city', 'City is required.');
```
to:
```js
if(delivery && !vals.city) er('city', 'City is required.');
```

**Files affected:** none by default; `ceylon spice kitchen/app.js` if you
choose to apply the optional fix above.

---

## Everything else

No other technical issues came up. Every endpoint listed in
`API_DOCUMENTATION.md` was executed against a running server with `curl`
during development (not just written and assumed correct), and the full
signup → browse menu → add to cart → checkout → view order flow was verified
in a real headless browser (Playwright) with zero console errors. See
`MANUAL_SETUP_GUIDE.md` → "Testing performed before delivery" for the full
list of what was actually run.
