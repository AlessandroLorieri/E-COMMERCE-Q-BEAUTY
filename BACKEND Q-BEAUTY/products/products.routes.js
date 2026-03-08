const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./products.controller");

const router = express.Router();

function adminRateKey(req) {
    const userKey = req.user?._uid || req.user?.sub;
    if (userKey) return userKey;
    return ipKeyGenerator(req.ip);
}

const adminReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminRateKey,
    message: { message: "Troppe richieste admin, riprova tra poco" },
});

const adminWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminRateKey,
    message: { message: "Troppe operazioni admin, riprova tra poco" },
});

// ADMIN
router.get("/admin", authRequired, adminOnly, adminReadLimiter, controller.adminList);
router.get("/admin/:id", authRequired, adminOnly, adminReadLimiter, controller.adminGetOne);

// CRUD admin
router.post("/", authRequired, adminOnly, adminWriteLimiter, controller.create);
router.patch("/:id", authRequired, adminOnly, adminWriteLimiter, controller.update);

// hard delete
router.delete("/:id/hard", authRequired, adminOnly, adminWriteLimiter, controller.hardRemove);

// soft delete
router.delete("/:id", authRequired, adminOnly, adminWriteLimiter, controller.remove);

// PUBBLICO (ALLA FINE)
router.get("/", controller.list);
router.get("/:id", controller.getOne);

module.exports = router;
