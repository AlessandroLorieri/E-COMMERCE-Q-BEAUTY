const express = require("express");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./coupons.controller");

const router = express.Router();

router.get("/admin", authRequired, adminOnly, controller.adminList);
router.get("/admin/:id", authRequired, adminOnly, controller.adminGet);
router.post("/admin", authRequired, adminOnly, controller.adminCreate);
router.patch("/admin/:id", authRequired, adminOnly, controller.adminUpdate);
router.delete("/admin/:id", authRequired, adminOnly, controller.adminDelete);

module.exports = router;
