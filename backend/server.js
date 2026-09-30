// server.js — Ceylon Spice Kitchen backend entry point
require("./utils/loadEnv")(); // tiny .env loader (see that file for why dotenv isn't used)

const http = require("http");
const path = require("path");
const fs = require("fs");
const { Router } = require("./utils/router");
const corsMiddleware = require("./middleware/corsMiddleware");
const { errorHandler } = require("./middleware/errorMiddleware");

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

const router = new Router();
router.setErrorHandler(errorHandler);
router.use(corsMiddleware(FRONTEND_URL));

// ---- Health check ----
router.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Ceylon Spice Kitchen API is running" });
});

// ---- Feature routes ----
require("./routes/authRoutes")(router);
require("./routes/menuRoutes")(router);
require("./routes/orderRoutes")(router);
require("./routes/contactRoutes")(router);
require("./routes/newsletterRoutes")(router);

// ---- Optional: serve the existing frontend + its /assets images ----
// (See section 54 of the original request / MANUAL_SETUP_GUIDE.md.)
const FRONTEND_DIR = path.join(__dirname, "..", "ceylon spice kitchen");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".json": "application/json",
};

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath.startsWith("/api/")) {
    await router.handle(req, res);
    return;
  }

  // Static file serving for the frontend (index.html, app.js, assets/*, etc.)
  // Falls back to index.html for any unknown path so the existing
  // hash-based (#/menu, #/cart, ...) routing keeps working.
  if (fs.existsSync(FRONTEND_DIR)) {
    let filePath = path.join(FRONTEND_DIR, urlPath === "/" ? "index.html" : urlPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(FRONTEND_DIR, "index.html");
    }
    const ext = path.extname(filePath);
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.statusCode = 404;
  res.end("Not found. (Frontend folder not found next to backend/ — API routes at /api/* still work.)");
});

server.listen(PORT, () => {
  console.log(`Ceylon Spice Kitchen API listening on http://localhost:${PORT}`);
  console.log(`Allowed frontend origin (CORS): ${FRONTEND_URL}`);
});
