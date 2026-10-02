const newsletterController = require("../controllers/newsletterController");

module.exports = function (router) {
  router.post("/api/newsletter", newsletterController.subscribe);
};
