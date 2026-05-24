const express = require("express");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const {
    publicList,
    publicGetBySlug,
    adminList,
    adminGet,
    adminCreate,
    adminUpdate,
    adminDelete,
} = require("./partners.controller");

const router = express.Router();

/*
 * PUBBLICHE
 */
router.get("/", publicList);
router.get("/slug/:slug", publicGetBySlug);

/*
 * ADMIN
 */
router.get("/admin", authRequired, adminOnly, adminList);
router.get("/admin/:id", authRequired, adminOnly, adminGet);
router.post("/admin", authRequired, adminOnly, adminCreate);
router.patch("/admin/:id", authRequired, adminOnly, adminUpdate);
router.delete("/admin/:id", authRequired, adminOnly, adminDelete);

module.exports = router;