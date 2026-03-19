const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const mongoose = require("mongoose");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./coupons.controller");

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

function isObjectId(v) {
    return mongoose.Types.ObjectId.isValid(String(v || ""));
}

function validateObjectIdParam(paramName) {
    return (req, res, next) => {
        const v = req.params?.[paramName];
        if (!isObjectId(v)) return res.status(400).json({ message: "ID non valido" });
        next();
    };
}

function pick(obj, allowedKeys) {
    const out = {};
    for (const k of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    }
    return out;
}

function normalizeCouponBody(req, res, next) {
    const raw = req.body && typeof req.body === "object" ? req.body : {};

    const allowed = [
        "code",
        "name",
        "isActive",
        "startsAt",
        "endsAt",
        "maxUses",
        "rules",
    ];

    const body = pick(raw, allowed);

    if (body.code != null) {
        body.code = String(body.code).trim().toUpperCase();
    }

    if (body.name != null) {
        body.name = String(body.name).trim();
    }

    if (body.isActive != null) {
        body.isActive = !!body.isActive;
    }

    if (body.maxUses != null && body.maxUses !== "") {
        const n = Number(body.maxUses);
        if (!Number.isFinite(n)) {
            return res.status(400).json({ message: "Campo non valido: maxUses" });
        }
        body.maxUses = n;
    }

    for (const f of ["startsAt", "endsAt"]) {
        if (body[f] != null && body[f] !== "") {
            const d = new Date(body[f]);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ message: `Data non valida: ${f}` });
            }
            body[f] = d;
        }
    }

    if (body.rules != null) {
        if (!Array.isArray(body.rules)) {
            return res.status(400).json({ message: "rules deve essere un array" });
        }

        body.rules = body.rules.map((r) => {
            const rule = r && typeof r === "object" ? r : {};

            return {
                productId: String(rule.productId || "").trim(),
                type: String(rule.type || "").trim().toLowerCase(),
                value:
                    rule.value === "" || rule.value == null
                        ? rule.value
                        : Number(rule.value),
            };
        });
    }

    req.body = body;
    next();
}

router.get("/admin", authRequired, adminOnly, adminReadLimiter, controller.adminList);

router.get(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminReadLimiter,
    validateObjectIdParam("id"),
    controller.adminGet
);

router.post(
    "/admin",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    normalizeCouponBody,
    controller.adminCreate
);

router.patch(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    normalizeCouponBody,
    controller.adminUpdate
);

router.delete(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    controller.adminDelete
);

module.exports = router;