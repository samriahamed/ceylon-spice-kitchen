// config.js
// Points the frontend at the backend REST API.
//
// If the frontend is being served BY the backend itself (see server.js,
// which can optionally serve this folder on the same port as the API),
// same-origin relative "/api" is used automatically. Otherwise it falls
// back to http://localhost:3000/api for local development where the
// frontend is opened via a separate static server (e.g. Live Server on
// port 5500) and the backend runs separately on port 3000.
//
// Deploying for real? Change the else-branch URL to your deployed backend's
// address (see MANUAL_SETUP_GUIDE.md).
window.CSK_API_BASE = (function () {
  if (location.port === "3000") return "/api";
  return "http://localhost:3000/api";
})();
