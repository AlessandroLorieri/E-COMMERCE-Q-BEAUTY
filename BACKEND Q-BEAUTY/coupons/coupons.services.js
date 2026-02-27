const mongoose = require("mongoose");
const Coupon = require("./coupons.schema");
const Product = require("../products/products.schema");

function normalizeCode(raw) {
    return String(raw || "").trim().toUpperCase();
}

function isValidCode(code) {
    return /^[A-Z0-9_-]{3,32}$/.test(code);
}

function parseDateOrNull(v) {
    if (v == null || v === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveRules(rulesRaw) {
    const errors = [];
    const out = [];
    const seen = new Set();

    const rules = Array.isArray(rulesRaw) ? rulesRaw : [];

    for (let i = 0; i < rules.length; i++) {
        const r = rules[i] || {};
        const e = {};

        const pidRaw = r.productId != null ? String(r.productId).trim() : "";
        if (!pidRaw) e.productId = "productId richiesto";

        let product = null;

        if (pidRaw && mongoose.Types.ObjectId.isValid(pidRaw)) {
            product = await Product.findOne({ _id: pidRaw, isActive: true }).select("productId").lean();
        } else if (pidRaw) {
            product = await Product.findOne({ productId: pidRaw, isActive: true }).select("productId").lean();
        }

        if (!product?.productId) e.productId = "Prodotto non valido o inattivo";

        const type = String(r.type || "").trim();
        if (type !== "percent" && type !== "fixed") e.type = "type deve essere 'percent' o 'fixed'";

        const value = Number(r.value);
        if (!Number.isFinite(value) || value <= 0) e.value = "value deve essere > 0";
        else if (type === "percent" && value > 100) e.value = "percent massimo 100";

        if (Object.keys(e).length) {
            errors[i] = e;
            continue;
        }

        const slug = String(product.productId).trim();
        if (seen.has(slug)) {
            errors[i] = { productId: "Prodotto duplicato nelle regole" };
            continue;
        }
        seen.add(slug);

        out.push({
            productId: slug,
            type,
            value: type === "fixed" ? Math.round(value) : value,
        });
    }

    return { rules: out, ruleErrors: errors };
}

async function createCoupon(payload) {
    const errors = {};

    const code = normalizeCode(payload?.code);
    if (!code || !isValidCode(code)) errors.code = "code non valido (3-32, A-Z/0-9/_/-)";

    const name = payload?.name != null ? String(payload.name).trim() : null;

    const isActive = payload?.isActive != null ? !!payload.isActive : true;
    const startsAt = parseDateOrNull(payload?.startsAt);
    const endsAt = parseDateOrNull(payload?.endsAt);

    if (payload?.startsAt && !startsAt) errors.startsAt = "startsAt non valido";
    if (payload?.endsAt && !endsAt) errors.endsAt = "endsAt non valido";
    if (startsAt && endsAt && endsAt < startsAt) errors.endsAt = "endsAt deve essere >= startsAt";

    const { rules, ruleErrors } = await resolveRules(payload?.rules);
    if (ruleErrors.some(Boolean)) errors.rules = ruleErrors;
    if (!rules.length) errors.rules = errors.rules || "Serve almeno 1 regola prodotto";

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    try {
        return await Coupon.create({ code, name, isActive, startsAt, endsAt, rules });
    } catch (e) {
        if (e && e.code === 11000) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { code: "Codice coupon già esistente" };
            throw err;
        }
        throw e;
    }
}

async function updateCoupon(id, payload) {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
        const err = new Error("Coupon not found");
        err.status = 404;
        throw err;
    }

    const errors = {};

    if (Object.prototype.hasOwnProperty.call(payload || {}, "code")) {
        const code = normalizeCode(payload?.code);
        if (!code || !isValidCode(code)) errors.code = "code non valido (3-32, A-Z/0-9/_/-)";
        else coupon.code = code;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, "name")) {
        coupon.name = payload?.name != null ? String(payload.name).trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, "isActive")) {
        coupon.isActive = !!payload.isActive;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, "startsAt")) {
        const d = parseDateOrNull(payload?.startsAt);
        if (payload?.startsAt && !d) errors.startsAt = "startsAt non valido";
        else coupon.startsAt = d;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, "endsAt")) {
        const d = parseDateOrNull(payload?.endsAt);
        if (payload?.endsAt && !d) errors.endsAt = "endsAt non valido";
        else coupon.endsAt = d;
    }

    if (coupon.startsAt && coupon.endsAt && coupon.endsAt < coupon.startsAt) {
        errors.endsAt = "endsAt deve essere >= startsAt";
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, "rules")) {
        const { rules, ruleErrors } = await resolveRules(payload?.rules);
        if (ruleErrors.some(Boolean)) errors.rules = ruleErrors;
        if (!rules.length) errors.rules = errors.rules || "Serve almeno 1 regola prodotto";
        coupon.rules = rules;
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    try {
        await coupon.save();
        return coupon;
    } catch (e) {
        if (e && e.code === 11000) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { code: "Codice coupon già esistente" };
            throw err;
        }
        throw e;
    }
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listCoupons({ page = 1, limit = 20, q } = {}) {
    const filter = {};

    if (q) {
        const rx = new RegExp(escapeRegExp(String(q).trim()), "i");
        filter.$or = [{ code: rx }, { name: rx }];
    }

    const p = Math.max(1, Math.trunc(page));
    const l = Math.min(100, Math.max(1, Math.trunc(limit)));
    const skip = (p - 1) * l;

    const total = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean();

    return { page: p, limit: l, total, pages: Math.max(1, Math.ceil(total / l)), coupons };
}

async function getCoupon(id) {
    const coupon = await Coupon.findById(id).lean();
    if (!coupon) {
        const err = new Error("Coupon not found");
        err.status = 404;
        throw err;
    }
    return coupon;
}

async function deleteCoupon(id) {
    const res = await Coupon.deleteOne({ _id: id });
    if (res.deletedCount !== 1) {
        const err = new Error("Coupon not found");
        err.status = 404;
        throw err;
    }
    return true;
}

async function findActiveCouponByCode(codeRaw) {
    const code = normalizeCode(codeRaw);
    if (!code || !isValidCode(code)) return null;

    const now = new Date();

    return Coupon.findOne({
        code,
        isActive: true,
        $and: [
            { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
            { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
    }).lean();
}

module.exports = {
    createCoupon,
    updateCoupon,
    listCoupons,
    getCoupon,
    deleteCoupon,
    findActiveCouponByCode,
};

