const express = require("express");
const { authRequired } = require("../middleware/auth.middleware");
const c = require("./addresses.controller");

const router = express.Router();

router.get("/me", authRequired, c.me);
router.post("/", authRequired, c.create);
router.patch("/:id/default", authRequired, c.setDefault);

router.get("/ping", (req, res) => res.json({ ok: true, route: "addresses" }));

module.exports = router;
