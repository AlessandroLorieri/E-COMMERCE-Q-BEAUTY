const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { authRequired, adminOnly } = require("../middleware/auth.middleware");
const controller = require("./orders.controller");
const mongoose = require("mongoose");

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

function pickString(v, maxLen = 200) {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeItems(itemsRaw) {
    if (!Array.isArray(itemsRaw)) return null;

    const items = [];
    for (const raw of itemsRaw) {
        const productId = pickString(raw?.productId ?? raw?.id ?? raw?.slug, 200);
        let qty = Number(raw?.qty ?? raw?.quantity);

        if (!productId) return null;
        if (!Number.isFinite(qty)) qty = 0;
        qty = Math.floor(qty);

        if (qty < 1 || qty > 999) return null;

        items.push({ productId, qty });
    }

    if (!items.length) return null;
    return items;
}

function pickShippingAddress(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

    const out = {};
    const name = pickString(raw.name, 80);
    const surname = pickString(raw.surname, 80);
    const email = pickString(raw.email, 254);
    const phone = pickString(raw.phone, 30);

    const address = pickString(raw.address, 160);
    const streetNumber = pickString(raw.streetNumber, 20);
    const city = pickString(raw.city, 80);
    const cap = pickString(raw.cap, 12);

    const taxCode = pickString(raw.taxCode, 20);

    if (name) out.name = name;
    if (surname) out.surname = surname;
    if (email) out.email = email;
    if (phone) out.phone = phone;

    if (address) out.address = address;
    if (streetNumber) out.streetNumber = streetNumber;
    if (city) out.city = city;
    if (cap) out.cap = cap;

    if (taxCode) out.taxCode = taxCode.toUpperCase();

    return Object.keys(out).length ? out : undefined;
}

function pickBillingAddress(raw) {
    return pickShippingAddress(raw);
}

function validateObjectIdParam(paramName) {
    return (req, res, next) => {
        const v = req.params?.[paramName];
        if (!isObjectId(v)) return res.status(400).json({ message: "ID non valido" });
        next();
    };
}

function validateQuoteBody(req, res, next) {
    const items = normalizeItems(req.body?.items);
    if (!items) return res.status(400).json({ message: "Items non validi" });

    const couponCode = pickString(req.body?.couponCode, 40);

    // whitelist
    req.body = {
        items,
        ...(couponCode ? { couponCode } : {}),
    };

    next();
}

function validateCreateBody(req, res, next) {
    const items = normalizeItems(req.body?.items);
    if (!items) return res.status(400).json({ message: "Items non validi" });

    const couponCode = pickString(req.body?.couponCode, 40);

    const paymentMethodRaw = pickString(req.body?.paymentMethod, 40);
    const paymentMethod = paymentMethodRaw ? paymentMethodRaw.toLowerCase() : undefined;
    const allowedPayment = new Set(["stripe", "bank_transfer", "bonifico"]);
    const finalPaymentMethod = paymentMethod && allowedPayment.has(paymentMethod) ? paymentMethod : undefined;

    const shippingAddressId = pickString(req.body?.shippingAddressId ?? req.body?.addressId, 80);
    const finalShippingAddressId = shippingAddressId && isObjectId(shippingAddressId) ? shippingAddressId : undefined;

    const shippingAddress = pickShippingAddress(req.body?.shippingAddress);
    const billingAddress = pickBillingAddress(req.body?.billingAddress);

    const taxCode = pickString(req.body?.taxCode, 20);
    const finalTaxCode = taxCode ? taxCode.toUpperCase() : undefined;

    const note = pickString(req.body?.note, 500);

    // whitelist
    req.body = {
        items,
        ...(couponCode ? { couponCode } : {}),
        ...(finalPaymentMethod ? { paymentMethod: finalPaymentMethod } : {}),
        ...(finalShippingAddressId ? { shippingAddressId: finalShippingAddressId } : {}),
        ...(shippingAddress ? { shippingAddress } : {}),
        ...(billingAddress ? { billingAddress } : {}),
        ...(finalTaxCode ? { taxCode: finalTaxCode } : {}),
        ...(typeof note === "string" ? { note } : {}),
    };

    next();
}

function validateAdminStatusBody(req, res, next) {
    const status = pickString(req.body?.status, 40);
    if (!status) return res.status(400).json({ message: "Status mancante" });

    const allowed = new Set([
        "pending_payment",
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
    ]);

    if (!allowed.has(status)) {
        return res.status(400).json({ message: "Status non valido" });
    }

    const rawShipment =
        req.body?.shipment &&
            typeof req.body.shipment === "object" &&
            !Array.isArray(req.body.shipment)
            ? req.body.shipment
            : null;

    const carrierName = pickString(rawShipment?.carrierName, 60);
    const trackingCode = pickString(rawShipment?.trackingCode, 120);
    const trackingUrl = pickString(rawShipment?.trackingUrl, 500);

    const shipment = rawShipment
        ? {
            ...(carrierName ? { carrierName } : {}),
            ...(trackingCode ? { trackingCode } : {}),
            ...(trackingUrl ? { trackingUrl } : {}),
        }
        : undefined;

    req.body = {
        status,
        ...(shipment ? { shipment } : {}),
    };

    next();
}

// POST quote
router.post("/quote", authRequired, validateQuoteBody, controller.quote);

// POST (crea ordine)
router.post("/", authRequired, validateCreateBody, controller.create);

// GET (lista ordini utente)
router.get("/me", authRequired, controller.mine);

// PATCH (simula pagamento)
router.patch("/:id/pay-demo", authRequired, validateObjectIdParam("id"), controller.payDemo);

// ADMIN - gestione ordini
router.get("/admin", authRequired, adminOnly, adminReadLimiter, controller.adminList);
router.get("/admin/stats", authRequired, adminOnly, adminReadLimiter, controller.adminStats);
router.get("/admin/stats/years", authRequired, adminOnly, adminReadLimiter, controller.adminStatsYears);

router.get(
    "/admin/:id",
    authRequired,
    adminOnly,
    adminReadLimiter,
    validateObjectIdParam("id"),
    controller.adminGet
);

router.patch(
    "/admin/:id/status",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    validateAdminStatusBody,
    controller.adminSetStatus
);

router.patch(
    "/admin/:id/cancel",
    authRequired,
    adminOnly,
    adminWriteLimiter,
    validateObjectIdParam("id"),
    controller.adminCancel
);

module.exports = router;