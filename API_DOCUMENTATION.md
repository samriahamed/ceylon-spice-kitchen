# Ceylon Spice Kitchen — API Documentation

Base URL (local development): `http://localhost:3000/api`

All responses are JSON and follow the shape:
```json
{ "success": true, ... }
{ "success": false, "message": "..." }
```

Authenticated routes require a header:
```
Authorization: Bearer <token>
```
The token is returned by `/api/auth/register` and `/api/auth/login`.

---

## Health

### `GET /api/health`
No auth required.

**Response 200**
```json
{ "success": true, "message": "Ceylon Spice Kitchen API is running" }
```

---

## Auth

### `POST /api/auth/register`
No auth required.

**Body**
```json
{
  "fullName": "Kavindu Perera",
  "email": "kavindu@example.com",
  "phone": "0771234567",
  "password": "password123"
}
```
Phone must match `0XXXXXXXXX` (10 digits, starting with 0). Password must be ≥6 characters.

**Response 201**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "fullName": "Kavindu Perera", "email": "kavindu@example.com", "phone": "0771234567" }
}
```

**Errors:** `400` invalid/missing field · `409` email already registered

---

### `POST /api/auth/login`
No auth required.

**Body**
```json
{ "email": "kavindu@example.com", "password": "password123" }
```

**Response 200:** same shape as register's response, `message: "Login successful"`.

**Errors:** `400` missing fields · `401` wrong email or password

---

### `GET /api/auth/me`
**Requires auth.**

**Response 200**
```json
{ "success": true, "user": { "id": 1, "fullName": "...", "email": "...", "phone": "..." } }
```

**Errors:** `401` missing/invalid/expired token

---

## Menu

### `GET /api/menu`
No auth required. Query parameters (all optional, combinable):

| Param | Example | Effect |
|---|---|---|
| `category` | `?category=Kottu` | Exact category match |
| `search` | `?search=chicken` | Matches name, category or description |
| `minPrice` / `maxPrice` | `?minPrice=750&maxPrice=1500` | Price range (LKR) |
| `sort` | `?sort=price_asc` | `price_asc`, `price_desc`, `rating`, `name` (default: popular+rating) |

**Response 200**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "chicken-kottu", "name": "Chicken Kottu", "category": "Kottu",
      "description": "...", "fullDescription": "...",
      "price": 1200, "image": "assets/chicken-kottu.jpg", "rating": 4.9,
      "prepTime": 18, "spiceLevel": "Medium", "ingredients": ["..."],
      "popular": true, "available": true, "customizable": true
    }
  ]
}
```
> Note: unlike a typical minimal listing, this response deliberately includes
> `fullDescription` and `ingredients` too. With only ~40 dishes total, the
> frontend fetches this once and caches the whole menu (including detail-page
> content) instead of making a second request per dish. See
> `PROJECT_CHALLENGES.md` if you'd rather split this into a lighter summary +
> a separate detail call per item.

### `GET /api/menu/:id`
No auth required. Example: `GET /api/menu/chicken-kottu`

**Response 200:** a single food object (same shape as above).
**Errors:** `404` food not found

### `GET /api/menu/categories`
No auth required.

**Response 200**
```json
{ "success": true, "data": [ { "name": "Kottu", "count": 5 }, ... ] }
```

---

## Orders

All three routes below **require auth**.

### `POST /api/orders`
**Body**
```json
{
  "orderType": "Delivery",
  "phone": "0771234567",
  "address": "No. 45, Station Road",
  "city": "Nugegoda",
  "note": "Less chilli please",
  "paymentMethod": "Cash on Delivery",
  "items": [
    { "foodId": "chicken-kottu", "quantity": 2, "spiceLevel": "Medium", "addons": [{ "id": "extra-egg" }] }
  ]
}
```
- `orderType`: `"Delivery"` or `"Pickup"`. `address`/`city` only required for Delivery.
- `paymentMethod`: `"Cash on Delivery"` or `"Card Demo"`.
- Any `unitPrice`/`price` sent inside `items` is **ignored** — every price is
  read fresh from the `foods` table on the server. See `orderController.js`.
- Delivery orders below LKR 1,000 subtotal are rejected (matches the existing
  frontend's minimum-delivery-order rule).

**Response 201**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": 1, "orderNumber": "CSK-948552", "createdAt": "2026-09-29 11:05:47",
    "orderType": "Delivery", "status": "Confirmed", "paymentMethod": "Cash on Delivery",
    "address": "No. 45, Station Road", "city": "Nugegoda", "note": "Less chilli please",
    "subtotal": 2700, "deliveryFee": 350, "discount": 0, "total": 3050,
    "items": [
      { "foodId": "chicken-kottu", "name": "Chicken Kottu", "unitPrice": 1350,
        "quantity": 2, "spiceLevel": "Medium", "addons": [{"id":"extra-egg","name":"Extra Egg","price":150}],
        "subtotal": 2700 }
    ]
  }
}
```

**Errors:** `400` validation (bad quantity, missing address, unsupported
order type/payment method, below delivery minimum) · `401` not logged in ·
`404` food item doesn't exist · `409` food item exists but is unavailable

### `GET /api/orders/my`
Returns only the logged-in user's orders, newest first.

**Response 200**
```json
{ "success": true, "count": 2, "data": [ /* order objects, same shape as above */ ] }
```

### `GET /api/orders/:id`
Returns one order **owned by the logged-in user**.

**Response 200:** a single order object.
**Errors:** `403` order exists but belongs to someone else · `404` no such order

---

## Contact

### `POST /api/contact`
No auth required.

**Body**
```json
{
  "name": "Kavindu Perera", "email": "kavindu@example.com", "phone": "0771234567",
  "subject": "Catering Request", "message": "I would like catering information for 30 people."
}
```
`message` must be at least 10 characters.

**Response 201**
```json
{ "success": true, "message": "Thanks — your message was saved successfully." }
```
**Errors:** `400` invalid/missing field

---

## Newsletter

### `POST /api/newsletter`
No auth required.

**Body**
```json
{ "email": "customer@example.com" }
```

**Response:** `201` on first subscription, `200` with a friendly message if
already subscribed (no duplicate row is created either way).

**Errors:** `400` invalid email

---

## Common error codes

| Code | Meaning |
|---|---|
| 400 | Validation failed (see `message` for the specific reason) |
| 401 | Missing/invalid/expired auth token, or wrong login credentials |
| 403 | Authenticated, but not allowed to access this resource (e.g. someone else's order) |
| 404 | Resource not found (food, order, or unknown route) |
| 409 | Conflict (duplicate email on register, ordering an unavailable food) |
| 500 | Unexpected server error — check the server's console output |
