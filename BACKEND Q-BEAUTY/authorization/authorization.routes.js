const express = require("express");
const controller = require("./authorization.controller");
const { authRequired } = require("../middleware/auth.middleware");

const router = express.Router();

// RECUPERO PASSWORD 
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

// register
router.post("/register", controller.register);

// login
router.post("/login", controller.login);

router.get("/me", authRequired, controller.me);
// (protetta) - aggiorna profilo + fatturazione
router.patch("/me", authRequired, controller.updateMe);

// /(protetta) - cambio password
router.patch("/password", authRequired, controller.changePassword);

module.exports = router;
