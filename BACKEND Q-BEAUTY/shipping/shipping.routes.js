const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./shipping.controller");

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

function normalizeShippingSettingsBody(req, res, next) {
    const raw = req.body && typeof req.body === "object" ? req.body : {};

    const out = {};

    if (raw.shippingCents !== undefined) {
        const n = Number(raw.shippingCents);
        if (!Number.isFinite(n) || n < 0) {
            return res.status(400).json({ message: "shippingCents non valido" });
        }
        out.shippingCents = Math.trunc(n);
    }

    if (raw.freeShippingThresholdCents !== undefined) {
        const n = Number(raw.freeShippingThresholdCents);
        if (!Number.isFinite(n) || n < 0) {
            return res.status(400).json({ message: "freeShippingThresholdCents non valido" });
        }
        out.freeShippingThresholdCents = Math.trunc(n);
    }

    req.body = out;
    next();
}

router.get("/admin", authRequired, adminOnly, adminReadLimiter, controller.adminGetShippingSettings);

router.patch(
    "/admin",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    normalizeShippingSettingsBody,
    controller.adminUpdateShippingSettings
);

module.exports = router;