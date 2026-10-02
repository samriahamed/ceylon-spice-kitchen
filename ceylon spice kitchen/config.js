// Points the frontend at the backend REST API.
window.CSK_API_BASE = (function () {
  if (location.port === "3000") return "/api";
  return "http://localhost:3000/api";
})();
