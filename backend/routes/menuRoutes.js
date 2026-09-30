// routes/menuRoutes.js
const menuController = require("../controllers/menuController");

module.exports = function (router) {
  // NOTE: /categories must be registered before /:id so it isn't swallowed
  // by the :id param match.
  router.get("/api/menu/categories", menuController.listCategories);
  router.get("/api/menu/addons", menuController.listAddons);
  router.get("/api/menu/:id", menuController.getFoodById);
  router.get("/api/menu", menuController.listFoods);
};
