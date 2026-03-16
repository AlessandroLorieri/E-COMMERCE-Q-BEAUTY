const Order = require("./orders.schema");
const User = require("../authorization/authorization.schema");
const { getProductsByIds } = require("../products/products.services");
const { normalizeShippingAddress } = require("../utils/normalizers/address.normalizer");
const Address = require("../addresses/addresses.schema");
const OrderCounter = require("../models/orderCounter.model");
const mongoose = require("mongoose");
const Product = require("../products/products.schema");
const Coupon = require("../coupons/coupons.schema");
const { sendShipmentEmail, sendOrderPaymentConfirmedEmail } = require("../utils/mailer");
const { findActiveCouponByCode } = require("../coupons/coupons.services");

const BULK_DISCOUNT_MIN_PIECES = 30;
const BULK_DISCOUNT_RATE = 0.25;
const SET_BULK_EQUIVALENT_QTY = 3;
const SET_FULL_PRICE_CENTS = 6770;

function normalizeTaxCode(v) {
    return String(v || "").trim().replace(/\s+/g, "").toUpperCase();
}

function normalizeVatNumber(v) {
    return String(v || "").replace(/[^\d]/g, "");
}

function normalizeCouponCode(v) {
    return String(v || "").trim().toUpperCase();
}

async function reserveCouponUsage(codeRaw) {
    const code = normalizeCouponCode(codeRaw);
    if (!code) return null;

    const now = new Date();

    const coupon = await Coupon.findOneAndUpdate(
        {
            code,
            isActive: true,
            $and: [
                { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
                { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
                {
                    $or: [
                        { maxUses: null },
                        { $expr: { $lt: ["$usedCount", "$maxUses"] } },
                    ],
                },
            ],
        },
        { $inc: { usedCount: 1 } },
        { new: true }
    );

    if (!coupon) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { couponCode: "Coupon non valido, scaduto o esaurito" };
        throw err;
    }

    return coupon;
}

async function markPersonalCouponAsUsed(couponDoc, orderId, userId) {
    if (!couponDoc?._id) return;

    const isPersonalCoupon = !!couponDoc.ownerUser || !!couponDoc.isRewardCoupon;
    if (!isPersonalCoupon) return;

    const update = {
        $set: {
            usedAt: new Date(),
            usedByOrder: orderId,
            usedByUser: userId,
        },
    };

    if (couponDoc.isRewardCoupon) {
        update.$set.isActive = false;
    }

    await Coupon.updateOne({ _id: couponDoc._id }, update);
}

async function releaseCouponReservation(codeRaw, orderId = null) {
    const code = normalizeCouponCode(codeRaw);
    if (!code) return;

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return;

    if (Number(coupon.usedCount || 0) > 0) {
        await Coupon.updateOne(
            { _id: coupon._id, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } }
        );
    }

    const isPersonalCoupon = !!coupon.ownerUser || !!coupon.isRewardCoupon;
    const sameOrder =
        orderId &&
        coupon.usedByOrder &&
        String(coupon.usedByOrder) === String(orderId);

    if (isPersonalCoupon && sameOrder) {
        const update = {
            $unset: {
                usedAt: "",
                usedByOrder: "",
                usedByUser: "",
            },
        };

        if (coupon.isRewardCoupon) {
            update.$set = { isActive: true };
        }

        await Coupon.updateOne({ _id: coupon._id }, update);
    }
}

function pickFirst(...vals) {
    for (const v of vals) {
        const s = String(v || "").trim();
        if (s) return s;
    }
    return "";
}

async function userHasCompletedOrders(userId) {
    const uid = String(userId || "").trim();
    if (!uid) return false;

    const VALID_STATUSES = ["draft", "pending_payment", "paid", "processing", "shipped", "completed", "refunded"];

    const isObjectId = mongoose.Types.ObjectId.isValid(uid);
    const userFilter = isObjectId
        ? { $in: [new mongoose.Types.ObjectId(uid), uid] }
        : uid;

    const exists = await Order.exists({
        user: userFilter,
        status: { $in: VALID_STATUSES },
    });

    return !!exists;
}

function normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        const err = new Error("Cart is empty or invalid");
        err.status = 400;
        throw err;
    }

    const map = new Map();

    for (const it of items) {
        const productId = String(it?.productId || it?.id || "").trim();

        let qty = Number(it?.qty);
        if (!Number.isFinite(qty)) qty = 1;

        qty = Math.floor(qty);
        if (qty < 1 || qty > 999) {
            const err = new Error("Qty non valida");
            err.status = 400;
            throw err;
        }

        if (!productId) {
            const err = new Error("Missing productId");
            err.status = 400;
            throw err;
        }

        map.set(productId, (map.get(productId) || 0) + qty);
    }

    return Array.from(map.entries()).map(([productId, qty]) => ({ productId, qty }));
}

async function computeQuote(userId, itemsRaw, couponCodeRaw) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    const items = normalizeItems(itemsRaw);
    const ids = items.map((i) => String(i.productId));

    const products = await getProductsByIds(ids);

    const map = new Map();
    for (const p of products) {
        if (p?._id) map.set(String(p._id), p);
        if (p?.productId) map.set(String(p.productId), p);
    }

    const SET_PRODUCT_ID = "SET EXPERIENCE";
    const normId = (v) => String(v ?? "").trim().toLowerCase();
    const SET_ID_NORM = normId(SET_PRODUCT_ID);

    for (const p of products) {
        if (p?.productId) map.set(normId(p.productId), p);
    }

    const missing = ids.filter((id) => !map.has(String(id)) && !map.has(normId(id)));
    if (missing.length) {
        const err = new Error(`Unknown or inactive products: ${missing.join(", ")}`);
        err.status = 400;
        throw err;
    }

    const resolvedItems = items.map((i) => {
        const p = map.get(i.productId) || map.get(normId(i.productId));

        const stock = Number(p.stockQty ?? 0);
        if (i.qty > stock) {
            const err = new Error("Stock insufficiente");
            err.status = 409;
            err.errors = {
                stock: {
                    [i.productId]: `Disponibili: ${stock}`,
                },
            };
            throw err;
        }

        const slug = p.productId ? String(p.productId) : null;
        const isSet = normId(slug) === SET_ID_NORM;

        let unitPriceCents = Number(p.priceCents);

        if (isSet) {
            unitPriceCents = user.customerType === "piva" ? 5400 : 6000;
        }

        if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
            const err = new Error("Prezzo prodotto non valido");
            err.status = 500;
            throw err;
        }

        const lineTotalCents = unitPriceCents * i.qty;

        return {
            productId: i.productId,

            productRef: String(p._id),
            productSlug: p.productId ? String(p.productId) : null,

            name: p.name,
            qty: i.qty,
            unitPriceCents,
            lineTotalCents,
            couponDiscountCents: 0,
        };
    });

    for (const it of resolvedItems) {
        it.couponDiscountCents = 0;
    }

    const bulkPiecesCount = resolvedItems.reduce((sum, it) => {
        const qty = Number(it.qty || 0);
        const isSetLine = normId(it.productSlug || "") === SET_ID_NORM;
        return sum + (isSetLine ? qty * SET_BULK_EQUIVALENT_QTY : qty);
    }, 0);

    const bulkDiscountActive = bulkPiecesCount >= BULK_DISCOUNT_MIN_PIECES;

    if (bulkDiscountActive) {
        for (const it of resolvedItems) {
            const isSetLine = normId(it.productSlug || "") === SET_ID_NORM;
            if (!isSetLine) continue;

            it.unitPriceCents = SET_FULL_PRICE_CENTS;
            it.lineTotalCents = SET_FULL_PRICE_CENTS * (Number(it.qty) || 1);
        }
    }

    const subtotalCents = resolvedItems.reduce((sum, it) => {
        return sum + (Number(it.lineTotalCents) || 0);
    }, 0);

    const discountBaseCents = resolvedItems.reduce((sum, it) => {
        const isSetLine = normId(it.productSlug || "") === SET_ID_NORM;

        if (!bulkDiscountActive && isSetLine) {
            return sum;
        }

        return sum + (Number(it.lineTotalCents) || 0);
    }, 0);

    let discountRate = 0;
    let globalLabel = null;
    let discountType = "none";

    if (bulkDiscountActive) {
        discountRate = BULK_DISCOUNT_RATE;
        globalLabel = "Sconto quantità -25%";
        discountType = "bulk25";
    } else if (user.customerType === "piva") {
        discountRate = 0.15;
        globalLabel = "Sconto P.IVA -15%";
        discountType = "piva15";
    } else if (user.customerType === "private") {
        const hasOrders = await userHasCompletedOrders(userId);
        if (!hasOrders) {
            discountRate = 0.10;
            globalLabel = "Primo acquisto -10%";
            discountType = "first10";
        }
    }

    let globalDiscountCents = Math.round(discountBaseCents * discountRate);
    if (!globalDiscountCents) {
        globalLabel = null;
        discountType = "none";
        globalDiscountCents = 0;
    }

    const discountableIdx = [];
    for (let i = 0; i < resolvedItems.length; i++) {
        const it = resolvedItems[i];
        const isSetLine = normId(it.productSlug || "") === SET_ID_NORM;

        if (bulkDiscountActive) {
            discountableIdx.push(i);
            continue;
        }

        if (isSetLine) continue;
        discountableIdx.push(i);
    }

    const alloc = new Array(resolvedItems.length).fill(0);

    if (globalDiscountCents > 0 && discountRate > 0 && discountableIdx.length) {
        const rows = discountableIdx.map((i) => {
            const line = Number(resolvedItems[i].lineTotalCents) || 0;
            const raw = line * discountRate;
            const flo = Math.floor(raw);
            const frac = raw - flo;
            return { i, flo, frac };
        });

        const sumFloor = rows.reduce((s, r) => s + r.flo, 0);
        let remaining = globalDiscountCents - sumFloor;

        rows.sort((a, b) => b.frac - a.frac);

        for (const r of rows) {
            let v = r.flo;
            if (remaining > 0) {
                v += 1;
                remaining -= 1;
            }
            const maxLine = Number(resolvedItems[r.i].lineTotalCents) || 0;
            alloc[r.i] = Math.min(v, maxLine);
        }
    }

    let couponCodeApplied = null;
    let couponDiscountCents = 0;

    const couponEnabled = !bulkDiscountActive;
    const couponDisabledReason = bulkDiscountActive
        ? "Con 30 o più pezzi si applica automaticamente lo sconto quantità -25%. I coupon non sono cumulabili."
        : null;

    if (couponEnabled && typeof couponCodeRaw === "string" && couponCodeRaw.trim()) {
        const code = couponCodeRaw.trim().toUpperCase();
        const coupon = await findActiveCouponByCode(code);

        if (!coupon) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { couponCode: "Coupon non valido o scaduto" };
            throw err;
        }

        const couponOwnerUserId = coupon?.ownerUser ? String(coupon.ownerUser) : "";
        const currentUserId = String(userId || "").trim();
        const isPersonalCoupon = !!couponOwnerUserId || !!coupon?.isRewardCoupon;

        if (isPersonalCoupon) {
            if (!couponOwnerUserId) {
                const err = new Error("Coupon configurato male");
                err.status = 500;
                throw err;
            }

            if (couponOwnerUserId !== currentUserId) {
                const err = new Error("Validation error");
                err.status = 400;
                err.errors = { couponCode: "Coupon non valido per questo account" };
                throw err;
            }

            if (coupon.usedAt || coupon.usedByOrder || coupon.usedByUser) {
                const err = new Error("Validation error");
                err.status = 400;
                err.errors = { couponCode: "Coupon già utilizzato" };
                throw err;
            }
        } else {
            const alreadyUsed = await Order.exists({
                user: userId,
                couponCodeApplied: code,
                status: { $nin: ["cancelled", "refunded"] },
            });

            if (alreadyUsed) {
                const err = new Error("Validation error");
                err.status = 400;
                err.errors = { couponCode: "Coupon già utilizzato" };
                throw err;
            }
        }

        const ruleMap = new Map();
        for (const r of coupon.rules || []) {
            const slug = r?.productId != null ? normId(r.productId) : "";
            if (slug) ruleMap.set(slug, r);
        }

        for (let i = 0; i < resolvedItems.length; i++) {
            const it = resolvedItems[i];
            const isSetLine = normId(it.productSlug || "") === SET_ID_NORM;
            if (isSetLine && !ruleMap.has(SET_ID_NORM)) {
                continue;
            }

            const rule = ruleMap.get(normId(it.productSlug || ""));
            if (!rule) continue;

            const type = String(rule.type || "").trim();
            const value = Number(rule.value);

            const lineBeforeCoupon = Math.max(
                0,
                (Number(it.lineTotalCents) || 0) - (Number(alloc[i]) || 0)
            );

            let lineDiscount = 0;

            if (type === "percent") {
                if (!Number.isFinite(value) || value <= 0 || value > 100) {
                    const err = new Error("Coupon configurato male");
                    err.status = 500;
                    throw err;
                }
                lineDiscount = Math.round(lineBeforeCoupon * (value / 100));
            } else if (type === "fixed") {
                if (!Number.isFinite(value) || value <= 0) {
                    const err = new Error("Coupon configurato male");
                    err.status = 500;
                    throw err;
                }
                lineDiscount = Math.round(value) * (Number(it.qty) || 1);
            } else {
                const err = new Error("Coupon configurato male");
                err.status = 500;
                throw err;
            }

            if (lineDiscount > lineBeforeCoupon) lineDiscount = lineBeforeCoupon;

            it.couponDiscountCents = lineDiscount;
            couponDiscountCents += lineDiscount;
        }

        if (!couponDiscountCents) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { couponCode: "Coupon non applicabile ai prodotti nel carrello" };
            throw err;
        }

        couponCodeApplied = code;
    }

    const discountCents = globalDiscountCents + couponDiscountCents;

    let discountLabel = null;
    if (discountCents > 0) {
        const parts = [];
        if (globalDiscountCents && globalLabel) parts.push(globalLabel);
        if (couponCodeApplied) parts.push(`Coupon ${couponCodeApplied}`);
        discountLabel = parts.length ? parts.join(" + ") : null;
    }

    const discountedTotalCents = Math.max(0, subtotalCents - discountCents);

    const shippingCents = discountedTotalCents >= 12000 ? 0 : 700;

    const totalCents = discountedTotalCents + shippingCents;

    return {
        items: resolvedItems,
        subtotalCents,
        discountCents,
        discountLabel,
        shippingCents,
        totalCents,
        discountType,
        couponCodeApplied,
        bulkDiscountActive,
        bulkPiecesCount,
        couponEnabled,
        couponDisabledReason,
        discountBreakdown: {
            couponDiscountCents,
            globalDiscountCents: Number(globalDiscountCents) || 0,
        },
    };
}


async function createOrder(userId, itemsRaw, shippingAddress, shippingAddressId, couponCode, taxCodeRaw, paymentMethodRaw, noteRaw) {
    const quote = await computeQuote(userId, itemsRaw, couponCode);

    const note = String(noteRaw || "").trim();

    const user = await User.findById(userId)
        .select("email firstName lastName phone customerType companyName vatNumber taxCode billingAddressRef")
        .lean();

    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    const incomingTaxCode =
        normalizeTaxCode(
            taxCodeRaw ||
            shippingAddress?.taxCode ||
            shippingAddress?.codiceFiscale ||
            shippingAddress?.fiscalCode
        ) || null;

    let normalizedAddress = null;
    let shippingAddressRef = null;

    if (shippingAddressId) {
        const addr = await Address.findOne({ _id: shippingAddressId, user: userId }).lean();
        if (!addr) {
            const err = new Error("Address not found");
            err.status = 404;
            throw err;
        }

        const addrTaxCode =
            normalizeTaxCode(addr?.taxCode || addr?.codiceFiscale || addr?.fiscalCode) || null;

        const finalTaxCode = incomingTaxCode || addrTaxCode || null;

        shippingAddressRef = addr._id;
        normalizedAddress = normalizeShippingAddress({
            name: addr.name,
            surname: addr.surname,
            email: addr.email,
            phone: addr.phone,
            taxCode: finalTaxCode || "",
            address: addr.address,
            streetNumber: addr.streetNumber,
            city: addr.city,
            cap: addr.cap,
        });

        normalizedAddress.phone = normalizedAddress.phone || addr.phone || "";
        normalizedAddress.streetNumber = normalizedAddress.streetNumber || addr.streetNumber || "";
        if (finalTaxCode) normalizedAddress.taxCode = finalTaxCode;

        if (incomingTaxCode && !addrTaxCode) {
            await Address.updateOne(
                { _id: addr._id, user: userId },
                { $set: { taxCode: incomingTaxCode, updatedAt: new Date() } }
            );
        }
    } else if (shippingAddress) {
        normalizedAddress = normalizeShippingAddress(shippingAddress);
        normalizedAddress.phone = normalizedAddress.phone || shippingAddress.phone || "";
        normalizedAddress.streetNumber = normalizedAddress.streetNumber || shippingAddress.streetNumber || "";
        if (incomingTaxCode) normalizedAddress.taxCode = incomingTaxCode;
    }

    if (!normalizedAddress) {
        const err = new Error("Missing shippingAddress or shippingAddressId");
        err.status = 400;
        throw err;
    }

    let billingAddressRef = null;
    let billingAddress = null;

    let billingAddr = null;
    if (user?.billingAddressRef && mongoose.Types.ObjectId.isValid(String(user.billingAddressRef))) {
        billingAddr = await Address.findOne({
            _id: user.billingAddressRef,
            user: userId,
        }).lean();

        if (billingAddr?._id) {
            billingAddressRef = billingAddr._id;
        }
    }

    const billingTaxCode =
        normalizeTaxCode(
            user?.taxCode ||
            billingAddr?.taxCode ||
            billingAddr?.codiceFiscale ||
            billingAddr?.fiscalCode ||
            incomingTaxCode ||
            normalizedAddress?.taxCode
        ) || "";

    const billingBase = normalizeShippingAddress({
        name: pickFirst(billingAddr?.name, normalizedAddress?.name, user?.firstName),
        surname: pickFirst(billingAddr?.surname, normalizedAddress?.surname, user?.lastName),
        email: pickFirst(billingAddr?.email, normalizedAddress?.email, user?.email),
        phone: pickFirst(billingAddr?.phone, normalizedAddress?.phone, user?.phone),
        taxCode: billingTaxCode,
        address: pickFirst(billingAddr?.address, normalizedAddress?.address),
        streetNumber: pickFirst(billingAddr?.streetNumber, normalizedAddress?.streetNumber),
        city: pickFirst(billingAddr?.city, normalizedAddress?.city),
        cap: pickFirst(billingAddr?.cap, normalizedAddress?.cap),
    });

    billingBase.phone = billingBase.phone || billingAddr?.phone || normalizedAddress?.phone || user?.phone || "";
    billingBase.streetNumber =
        billingBase.streetNumber || billingAddr?.streetNumber || normalizedAddress?.streetNumber || "";
    if (billingTaxCode) billingBase.taxCode = billingTaxCode;

    billingAddress = {
        companyName: user?.customerType === "piva" ? String(user?.companyName || "").trim() : "",
        vatNumber: user?.customerType === "piva" ? normalizeVatNumber(user?.vatNumber) : "",
        name: billingBase.name || "",
        surname: billingBase.surname || "",
        phone: billingBase.phone || "",
        email: billingBase.email || "",
        taxCode: billingBase.taxCode || "",
        address: billingBase.address || "",
        streetNumber: billingBase.streetNumber || "",
        city: billingBase.city || "",
        cap: billingBase.cap || "",
    };

    const decremented = [];
    let reservedCoupon = null;
    let order = null;

    try {
        for (const it of quote.items || []) {
            const res = await Product.updateOne(
                { _id: it.productRef, isActive: true, stockQty: { $gte: it.qty } },
                { $inc: { stockQty: -it.qty } }
            );

            if (res.modifiedCount !== 1) {
                const err = new Error(`Stock insufficiente per ${it.name}`);
                err.status = 409;
                err.errors = {
                    stock: { [it.productId]: "Stock insufficiente" },
                };
                throw err;
            }

            decremented.push({ _id: it.productRef, qty: it.qty });
        }

        if (quote.couponCodeApplied) {
            reservedCoupon = await reserveCouponUsage(quote.couponCodeApplied);
        }

        const year = new Date().getFullYear();

        const counter = await OrderCounter.findOneAndUpdate(
            { year },
            { $inc: { seq: 1 }, $setOnInsert: { year } },
            { new: true, upsert: true }
        );

        const orderNumber = 99 + counter.seq;
        const publicId = `#${year}${orderNumber}`;

        order = await Order.create({
            user: userId,
            publicId,
            status: "pending_payment",
            items: quote.items,

            shippingAddress: normalizedAddress,
            shippingAddressRef,

            billingAddress,
            billingAddressRef,

            subtotalCents: quote.subtotalCents,
            discountCents: quote.discountCents,
            couponCodeApplied: quote.couponCodeApplied || null,
            couponDiscountCents: quote?.discountBreakdown?.couponDiscountCents ?? 0,
            globalDiscountCents: quote?.discountBreakdown?.globalDiscountCents ?? 0,
            discountLabel: quote.discountLabel,
            shippingCents: quote.shippingCents,
            totalCents: quote.totalCents,
            discountType: quote.discountType,
            note,
        });

        if (reservedCoupon && (reservedCoupon.ownerUser || reservedCoupon.isRewardCoupon)) {
            await markPersonalCouponAsUsed(reservedCoupon, order._id, userId);
        }

        return { order, quote };
    } catch (err) {
        if (order?._id) {
            try {
                await Order.deleteOne({ _id: order._id });
            } catch { }
        }

        if (reservedCoupon?._id) {
            try {
                await releaseCouponReservation(quote.couponCodeApplied, order?._id || null);
            } catch { }
        }

        for (const d of decremented) {
            try {
                await Product.updateOne({ _id: d._id }, { $inc: { stockQty: d.qty } });
            } catch { }
        }

        throw err;
    }
}


async function listMyOrders(userId) {
    return Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean();
}

async function demoMarkPaid(userId, orderId) {
    if (process.env.NODE_ENV === "production") {
        const err = new Error("Not found");
        err.status = 404;
        throw err;
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }

    order.status = "paid";
    await order.save();
    return order;
}

const ALLOWED_ORDER_STATUSES = new Set([
    "pending_payment",
    "paid",
    "processing",
    "shipped",
    "completed",
    "cancelled",
    "refunded",
]);

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clipStr(v, maxLen) {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function looksLikeUrl(s) {
    const v = String(s || "").trim().toLowerCase();
    return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("www.");
}

function normalizeUrlInput(s) {
    const v = String(s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
}

function isValidHttpUrl(s) {
    try {
        const u = new URL(String(s));
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function buildCreatedAtRange({ year, month, week } = {}) {
    const y = Number(year);
    const m = Number(month);
    const w = Number(week);

    if (!Number.isInteger(y)) return null;

    if (Number.isInteger(w)) {
        const jan4 = new Date(Date.UTC(y, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7; // domenica -> 7
        const week1Monday = new Date(Date.UTC(y, 0, 4 - (jan4Day - 1)));

        const start = new Date(week1Monday);
        start.setUTCDate(week1Monday.getUTCDate() + (w - 1) * 7);

        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 7);

        return { start, end };
    }

    if (Number.isInteger(m)) {
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 1));
        return { start, end };
    }

    return {
        start: new Date(Date.UTC(y, 0, 1)),
        end: new Date(Date.UTC(y + 1, 0, 1)),
    };
}

async function adminSetOrderStatus(orderId, newStatus, shipment) {
    const id = String(orderId || "").trim();
    const status = String(newStatus || "").trim();

    if (!id) {
        const err = new Error("Order id required");
        err.status = 400;
        throw err;
    }

    if (!status) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { status: "Status richiesto" };
        throw err;
    }

    if (!ALLOWED_ORDER_STATUSES.has(status)) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = {
            status: `Status non valido. Ammessi: ${Array.from(ALLOWED_ORDER_STATUSES).join(", ")}`,
        };
        throw err;
    }

    const order = await Order.findById(id);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }

    const shipObj = shipment && typeof shipment === "object" ? shipment : null;

    const inCarrierName = clipStr(shipObj?.carrierName, 60);
    let inTrackingCode = clipStr(shipObj?.trackingCode, 120);
    let inTrackingUrl = clipStr(shipObj?.trackingUrl, 500);

    if (inTrackingCode && looksLikeUrl(inTrackingCode)) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { shipment: "Il codice tracking non può essere un link" };
        throw err;
    }

    if (inTrackingUrl) {
        inTrackingUrl = normalizeUrlInput(inTrackingUrl);
        if (!isValidHttpUrl(inTrackingUrl)) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { shipment: "Link tracking non valido" };
            throw err;
        }
    }

    const hasIncomingTracking = !!(inCarrierName || inTrackingCode || inTrackingUrl);

    const existingCarrierName = order?.shipment?.carrierName ? String(order.shipment.carrierName).trim() : "";
    const existingTrackingCode = order?.shipment?.trackingCode ? String(order.shipment.trackingCode).trim() : "";
    const existingTrackingUrl = order?.shipment?.trackingUrl ? String(order.shipment.trackingUrl).trim() : "";

    const finalTrackingCodeForValidation = (inTrackingCode || existingTrackingCode).trim();
    const finalTrackingUrlForValidation = (inTrackingUrl || existingTrackingUrl).trim();

    if (status === "shipped" && (!finalTrackingCodeForValidation || !finalTrackingUrlForValidation)) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { shipment: "Per segnare come spedito servono codice tracking E link tracking" };
        throw err;
    }

    order.status = status;

    if (hasIncomingTracking) {
        order.shipment = order.shipment || {};
        if (inCarrierName) order.shipment.carrierName = inCarrierName;
        if (inTrackingCode) order.shipment.trackingCode = inTrackingCode;
        if (inTrackingUrl) order.shipment.trackingUrl = inTrackingUrl;
    }

    if (status === "shipped") {
        order.shipment = order.shipment || {};
        if (!order.shipment.shippedAt) order.shipment.shippedAt = new Date();
    }

    await order.save();

    if (order.status === "paid") {
        try {
            const ordersCol = mongoose.connection.collection("orders");
            const raw = await ordersCol.findOne(
                { _id: order._id },
                { projection: { paymentEmailSentAt: 1 } }
            );

            if (raw?.paymentEmailSentAt) {
                // già inviata, skip
            } else {
                const user = await User.findById(order.user).select("email").lean();

                const to = order?.shippingAddress?.email || user?.email || null;

                if (to) {
                    await sendOrderPaymentConfirmedEmail({ to, order, includeItems: true });

                    await ordersCol.updateOne(
                        { _id: order._id, paymentEmailSentAt: { $exists: false } },
                        { $set: { paymentEmailSentAt: new Date() } }
                    );
                } else {
                    console.warn("adminSetOrderStatus: email pagamento non inviata (destinatario mancante)", {
                        orderId: String(order._id),
                        publicId: order.publicId,
                    });
                }
            }
        } catch (e) {
            console.error("sendOrderPaymentConfirmedEmail (admin paid) failed:", e?.message || e);
        }
    }

    if (order.status === "shipped") {
        order.shipment = order.shipment || {};

        const alreadyNotified = !!order.shipment.notifiedAt;
        const finalTrackingCode = order.shipment.trackingCode ? String(order.shipment.trackingCode).trim() : "";
        const finalTrackingUrl = order.shipment.trackingUrl ? String(order.shipment.trackingUrl).trim() : "";
        const finalCarrierName = order.shipment.carrierName ? String(order.shipment.carrierName).trim() : "";

        const canSend = !!(finalTrackingCode && finalTrackingUrl);

        if (!alreadyNotified && canSend) {
            const user = await User.findById(order.user).select("email firstName").lean();

            if (user?.email) {
                try {
                    await sendShipmentEmail({
                        to: user.email,
                        name: user.firstName,
                        publicId: order.publicId || `#${order._id}`,
                        carrierName: finalCarrierName,
                        trackingCode: finalTrackingCode,
                        trackingUrl: finalTrackingUrl,
                    });

                    order.shipment.notifiedAt = new Date();
                    await order.save();
                } catch (e) {
                    console.error("sendShipmentEmail failed:", e?.message || e);
                }
            }
        }
    }

    return order;
}

async function adminListOrders({ page = 1, limit = 20, status, q, year, month, week } = {}) {
    const filter = {};

    if (status) filter.status = String(status).trim();

    const createdAtRange = buildCreatedAtRange({ year, month, week });
    if (createdAtRange) {
        filter.createdAt = {
            $gte: createdAtRange.start,
            $lt: createdAtRange.end,
        };
    }

    let or = null;

    if (q) {
        const query = String(q).trim();
        if (query) {
            const rx = new RegExp(escapeRegExp(query), "i");

            or = [{ publicId: rx }];

            const users = await User.find({
                $or: [
                    { email: rx },
                    { firstName: rx },
                    { lastName: rx },
                    { companyName: rx },
                    { vatNumber: rx },
                    { taxCode: rx },
                ],
            })
                .select("_id")
                .lean();

            if (users.length) {
                or.push({ user: { $in: users.map((u) => u._id) } });
            }
        }
    }

    if (or) filter.$or = or;

    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("user", "email firstName lastName customerType role companyName vatNumber taxCode billingAddressRef")
        .lean();

    return {
        page: Math.max(1, page),
        limit: Math.max(1, limit),
        total,
        pages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
        orders,
    };
}

async function adminGetOrder(idOrPublicId) {
    const raw = String(idOrPublicId || "").trim();
    if (!raw) {
        const err = new Error("Order id required");
        err.status = 400;
        throw err;
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(raw);
    const query = isObjectId ? { _id: raw } : { publicId: raw };

    const order = await Order.findOne(query)
        .populate("user", "email firstName lastName customerType role companyName vatNumber taxCode billingAddressRef")
        .lean();

    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }

    return order;
}

async function adminGetDashboardStats({ range = "week", year = null } = {}) {
    const TZ = "Europe/Rome";

    const inProgressStatuses = ["paid", "processing"];
    const shippedStatus = "shipped";
    const revenueStatuses = ["paid", "processing", "shipped", "completed"];

    const RANGES = new Set(["day", "week", "month", "year"]);
    const r = RANGES.has(String(range)) ? String(range) : "week";

    const yearNum = Number(year);
    const hasYear = Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 3000;

    const daysBack =
        r === "day" ? 0 :
            r === "week" ? 6 :
                r === "month" ? 29 :
                    0;

    const rangeLabel =
        r === "year"
            ? (hasYear ? `Anno ${yearNum}` : "Anno corrente")
            : (r === "day" ? "Oggi" : r === "week" ? "Ultimi 7 giorni" : "Ultimi 30 giorni");

    const [result] = await Order.aggregate([
        {
            $addFields: {
                __rangeStart:
                    r === "year"
                        ? (hasYear
                            ? { $dateFromParts: { year: yearNum, month: 1, day: 1, timezone: TZ } }
                            : { $dateTrunc: { date: "$$NOW", unit: "year", timezone: TZ } }
                        )
                        : {
                            $dateSubtract: {
                                startDate: { $dateTrunc: { date: "$$NOW", unit: "day", timezone: TZ } },
                                unit: "day",
                                amount: daysBack,
                            },
                        },

                __rangeEnd:
                    r === "year"
                        ? (hasYear
                            ? { $dateFromParts: { year: yearNum + 1, month: 1, day: 1, timezone: TZ } }
                            : {
                                $dateAdd: {
                                    startDate: { $dateTrunc: { date: "$$NOW", unit: "year", timezone: TZ } },
                                    unit: "year",
                                    amount: 1,
                                },
                            }
                        )
                        : "$$NOW",
            },
        },
        {
            $facet: {
                ordersInRange: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $gte: ["$createdAt", "$__rangeStart"] },
                                    { $lt: ["$createdAt", "$__rangeEnd"] },
                                ],
                            },
                        },
                    },
                    { $count: "count" },
                ],

                inProgressInRange: [
                    {
                        $match: {
                            status: { $in: inProgressStatuses },
                            $expr: {
                                $and: [
                                    { $gte: ["$createdAt", "$__rangeStart"] },
                                    { $lt: ["$createdAt", "$__rangeEnd"] },
                                ],
                            },
                        },
                    },
                    { $count: "count" },
                ],

                shippedInRange: [
                    {
                        $match: {
                            status: shippedStatus,
                            $expr: {
                                $and: [
                                    { $gte: ["$createdAt", "$__rangeStart"] },
                                    { $lt: ["$createdAt", "$__rangeEnd"] },
                                ],
                            },
                        },
                    },
                    { $count: "count" },
                ],

                revenueInRange: [
                    {
                        $match: {
                            status: { $in: revenueStatuses },
                            $expr: {
                                $and: [
                                    { $gte: ["$createdAt", "$__rangeStart"] },
                                    { $lt: ["$createdAt", "$__rangeEnd"] },
                                ],
                            },
                        },
                    },
                    { $group: { _id: null, totalCents: { $sum: "$totalCents" }, orders: { $sum: 1 } } },
                ],
            },
        },
    ]);

    const orders = result?.ordersInRange?.[0]?.count || 0;
    const inProgress = result?.inProgressInRange?.[0]?.count || 0;
    const shipped = result?.shippedInRange?.[0]?.count || 0;

    const revenueTotalCents = result?.revenueInRange?.[0]?.totalCents || 0;
    const revenueOrders = result?.revenueInRange?.[0]?.orders || 0;

    return {
        range: r,
        rangeLabel,
        orders,
        inProgress,
        shipped,
        revenue: { totalCents: revenueTotalCents, orders: revenueOrders },
    };
}

async function adminGetDashboardYears() {
    const TZ = "Europe/Rome";

    const rows = await Order.aggregate([
        {
            $group: {
                _id: { $year: { date: "$createdAt", timezone: TZ } },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const years = rows.map((r) => Number(r._id)).filter((y) => Number.isFinite(y));

    const currentYear = new Date().getFullYear();
    if (!years.length) return { years: [currentYear] };

    if (!years.includes(currentYear)) years.push(currentYear);

    years.sort((a, b) => a - b);

    return { years };
}

async function adminCancelOrderAndRestock(id) {
    const order = await Order.findById(id);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }

    if (["cancelled", "refunded", "completed"].includes(order.status)) {
        return order;
    }

    if (order.status === "pending_payment") {
        for (const it of order.items || []) {
            const ref = it.productRef != null ? String(it.productRef) : "";
            const pid = it.productId != null ? String(it.productId) : "";

            let q = null;

            if (ref && mongoose.Types.ObjectId.isValid(ref)) {
                q = { _id: ref };
            } else {
                const or = [];

                if (pid && mongoose.Types.ObjectId.isValid(pid)) {
                    or.push({ _id: pid });
                }
                if (pid) {
                    or.push({ productId: pid });
                }

                if (!or.length) continue;

                q = or.length === 1 ? or[0] : { $or: or };
            }

            await Product.findOneAndUpdate(q, { $inc: { stockQty: it.qty } });
        }
    }

    if (order.couponCodeApplied) {
        await releaseCouponReservation(order.couponCodeApplied, order._id);
    }

    order.status = "cancelled";
    await order.save();
    return order;
}

module.exports = {
    computeQuote,
    createOrder,
    listMyOrders,
    demoMarkPaid,
    adminListOrders,
    adminGetOrder,
    adminSetOrderStatus,
    adminGetDashboardStats,
    adminCancelOrderAndRestock,
    adminGetDashboardYears,
};


