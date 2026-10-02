const { requireAuth } = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");

module.exports = function (router) {
  router.post("/api/orders", requireAuth, orderController.createOrder);
  router.get("/api/orders/my", requireAuth, orderController.getMyOrders);
  router.get("/api/orders/:id", requireAuth, orderController.getOrderById);
};
