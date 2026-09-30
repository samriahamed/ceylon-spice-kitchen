// routes/contactRoutes.js
const contactController = require("../controllers/contactController");

module.exports = function (router) {
  router.post("/api/contact", contactController.submitContactMessage);
};
