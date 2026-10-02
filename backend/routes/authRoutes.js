const { requireAuth } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

module.exports = function (router) {
  router.post("/api/auth/register", authController.register);
  router.post("/api/auth/login", authController.login);
  router.get("/api/auth/me", requireAuth, authController.me);
};
