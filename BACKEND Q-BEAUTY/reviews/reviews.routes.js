const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./reviews.controller");

const router = express.Router();

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

function pickString(v, maxLen = 2000) {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function validateCreateReviewBody(req, res, next) {
    const role = pickString(req.body?.role, 80);
    const city = pickString(req.body?.city, 80);
    const text = pickString(req.body?.text, 2000);
    const ratingRaw = req.body?.rating;

    const rating = Number(ratingRaw);
    const errors = {};

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        errors.rating = "rating non valido";
    }

    if (!text || text.length < 20) {
        errors.text = "La recensione deve contenere almeno 20 caratteri";
    }

    if (Object.keys(errors).length) {
        return res.status(400).json({ message: "Validation error", errors });
    }

    req.body = {
        rating: Math.round(rating),
        text,
        ...(role ? { role } : {}),
        ...(city ? { city } : {}),
    };

    next();
}

function adminRateKey(req) {
    return req.user?._uid || req.user?.sub || req.ip;
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

// PUBBLICO
router.get("/", controller.listPublic);

// UTENTE LOGGATO
router.post("/", authRequired, validateCreateReviewBody, controller.create);

// ADMIN
router.get("/admin", authRequired, adminOnly, adminReadLimiter, controller.adminList);

router.get(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminReadLimiter,
    validateObjectIdParam("id"),
    controller.adminGet
);

router.patch(
    "/admin/:id/approve",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    controller.adminApprove
);

router.delete(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    controller.adminReject
);

module.exports = router;