// routes/orderRoutes.js
const { requireAuth } = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");

module.exports = function (router) {
  // NOTE: /my must be registered before /:id for the same reason as above.
  router.post("/api/orders", requireAuth, orderController.createOrder);
  router.get("/api/orders/my", requireAuth, orderController.getMyOrders);
  router.get("/api/orders/:id", requireAuth, orderController.getOrderById);
};
