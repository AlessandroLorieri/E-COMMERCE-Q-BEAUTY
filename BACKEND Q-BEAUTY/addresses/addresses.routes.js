const express = require("express");
const mongoose = require("mongoose");
const { authRequired } = require("../middleware/auth.middleware");
const c = require("./addresses.controller");

const router = express.Router();

function isObjectId(v) {
    return mongoose.Types.ObjectId.isValid(String(v || ""));
}

function pickString(v, maxLen = 200) {
    const s = String(v ?? "").trim();
    if (!s) return undefined;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function pickBool(v) {
    if (v === true || v === false) return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
}

function validateObjectIdParam(paramName) {
    return (req, res, next) => {
        const v = req.params?.[paramName];
        if (!isObjectId(v)) return res.status(400).json({ message: "ID non valido" });
        next();
    };
}

function validateCreateAddressBody(req, res, next) {
    const raw = req.body || {};

    // campi "attesi" (whitelist): aggiungiamo anche alcuni plausibili per non romperti UX
    const payload = {
        name: pickString(raw.name, 80),
        surname: pickString(raw.surname, 80),
        email: pickString(raw.email, 254),
        phone: pickString(raw.phone, 30),

        address: pickString(raw.address, 160),
        streetNumber: pickString(raw.streetNumber, 20),
        city: pickString(raw.city, 80),
        cap: pickString(raw.cap, 12),

        taxCode: pickString(raw.taxCode, 20),
        // opzionali comuni (se nel tuo schema non esistono, verranno ignorati dal controller/schema)
        label: pickString(raw.label, 40),
        province: pickString(raw.province, 40),
        country: pickString(raw.country, 40),
        isDefault: pickBool(raw.isDefault),
    };

    // normalizzazione taxCode
    if (payload.taxCode) payload.taxCode = payload.taxCode.toUpperCase();

    // requisiti minimi (non troppo aggressivi, ma evita “indirizzi vuoti”)
    if (!payload.address || !payload.city || !payload.cap) {
        return res.status(400).json({ message: "Indirizzo non valido" });
    }

    // rimuove undefined
    for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
    }

    req.body = payload;
    next();
}

router.get("/me", authRequired, c.me);

// crea indirizzo (body whitelist + validazione minima)
router.post("/", authRequired, validateCreateAddressBody, c.create);

// set default (id valido)
router.patch("/:id/default", authRequired, validateObjectIdParam("id"), c.setDefault);

router.get("/ping", (req, res) => res.json({ ok: true, route: "addresses" }));

module.exports = router;