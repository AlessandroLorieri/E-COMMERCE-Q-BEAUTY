const express = require("express");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./products.controller");

const router = express.Router();

// ADMIN 
router.get("/admin", authRequired, adminOnly, controller.adminList);
router.get("/admin/:id", authRequired, adminOnly, controller.adminGetOne);

// CRUD admin
router.post("/", authRequired, adminOnly, controller.create);
router.patch("/:id", authRequired, adminOnly, controller.update);

// hard delete 
router.delete("/:id/hard", authRequired, adminOnly, controller.hardRemove);

// soft delete
router.delete("/:id", authRequired, adminOnly, controller.remove);

// PUBBLICO (ALLA FINE)
router.get("/", controller.list);
router.get("/:id", controller.getOne);

module.exports = router;
