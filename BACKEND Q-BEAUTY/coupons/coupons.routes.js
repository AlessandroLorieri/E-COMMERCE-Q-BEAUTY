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

    // whitelist: tienila ampia ma controllata (evita mass-assignment)
    const allowed = [
        "code",
        "type",
        "amount",
        "percent",
        "active",
        "startsAt",
        "endsAt",
        "minOrderCents",
        "maxDiscountCents",
        "usageLimit",
        "scope",
        "products",
        "customerType",
        "note",
    ];

    const body = pick(raw, allowed);

    // normalizzazioni leggere (non invasive)
    if (body.code != null) body.code = String(body.code).trim().toUpperCase();
    if (body.type != null) body.type = String(body.type).trim().toLowerCase();
    if (body.scope != null) body.scope = String(body.scope).trim().toLowerCase();
    if (body.customerType != null) body.customerType = String(body.customerType).trim().toLowerCase();

    // numeri in Number se arrivano stringhe
    const numFields = ["amount", "percent", "minOrderCents", "maxDiscountCents", "usageLimit"];
    for (const f of numFields) {
        if (body[f] != null && body[f] !== "") {
            const n = Number(body[f]);
            if (!Number.isFinite(n)) return res.status(400).json({ message: `Campo non valido: ${f}` });
            body[f] = n;
        }
    }

    // date parseabili
    const dateFields = ["startsAt", "endsAt"];
    for (const f of dateFields) {
        if (body[f] != null && body[f] !== "") {
            const d = new Date(body[f]);
            if (Number.isNaN(d.getTime())) return res.status(400).json({ message: `Data non valida: ${f}` });
            body[f] = d;
        }
    }

    // products: array di id/slug stringhe (non tocchiamo troppo)
    if (body.products != null) {
        if (!Array.isArray(body.products)) return res.status(400).json({ message: "products deve essere un array" });
        body.products = body.products.map((x) => String(x || "").trim()).filter(Boolean);
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