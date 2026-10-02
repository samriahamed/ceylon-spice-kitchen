const menuController = require("../controllers/menuController");

module.exports = function (router) {
// Menu routes
  router.get("/api/menu/categories", menuController.listCategories);
  router.get("/api/menu/addons", menuController.listAddons);
  router.get("/api/menu/:id", menuController.getFoodById);
  router.get("/api/menu", menuController.listFoods);
};
