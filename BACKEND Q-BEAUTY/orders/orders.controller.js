const {
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
    adminGetSoldProducts,
    adminSendBankReminder: adminSendBankReminderService,
} = require("./orders.services");

const Order = require("./orders.schema");

const mongoose = require("mongoose");
const User = require("../authorization/authorization.schema");
const { sendAdminNewOrderEmail } = require("../utils/mailer");

const { validateCreateOrderBody, validateQuoteBody } = require("./validators/createOrder.validator");

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


async function quote(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const errors = validateQuoteBody(req.body);

        if (Object.keys(errors).length) {
            return res.status(400).json({ message: "Validation error", errors });
        }

        const { items, couponCode } = req.body || {};
        const result = await computeQuote(userId, items, couponCode);

        return res.json(result);
    } catch (err) {
        const status = err.status || 500;

        const couponMsg = err?.errors?.couponCode ? String(err.errors.couponCode) : null;

        return res.status(status).json({
            message: couponMsg || err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function create(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const errors = validateCreateOrderBody(req.body);
        if (Object.keys(errors).length) {
            return res.status(400).json({ message: "Validation error", errors });
        }

        const {
            items,
            shippingAddress,
            shippingAddressId,
            billingAddress,
            couponCode,
            taxCode,
            paymentMethod,
            note,
        } = req.body || {};

        const { order, quote } = await createOrder(
            userId,
            items,
            shippingAddress,
            shippingAddressId,
            billingAddress,
            couponCode,
            taxCode,
            paymentMethod,
            note
        );

        const normalizedPaymentMethod = String(paymentMethod || "").trim().toLowerCase();

        if (normalizedPaymentMethod === "bank_transfer" || normalizedPaymentMethod === "bonifico") {
            setImmediate(async () => {
                try {
                    const u = await User.findById(userId).select("email firstName lastName").lean();

                    await sendAdminNewOrderEmail({
                        order,
                        user: {
                            _id: userId,
                            email: u?.email || null,
                            name: [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim(),
                        },
                        paymentMethod: "bank_transfer",
                    });

                    try {
                        await mongoose.connection.collection("orders").updateOne(
                            { _id: new mongoose.Types.ObjectId(String(order._id)), adminEmailSentAt: { $exists: false } },
                            { $set: { adminEmailSentAt: new Date() } }
                        );
                    } catch { }
                } catch (e) {
                    console.error("Admin bank-transfer email failed:", e?.message || e);
                }
            });
        }

        return res.status(201).json({
            orderId: order._id,
            publicId: order.publicId,
            status: order.status,
            subtotalCents: order.subtotalCents,
            discountCents: order.discountCents,
            discountLabel: order.discountLabel,
            shippingCents: order.shippingCents,
            totalCents: order.totalCents,
            discountType: order.discountType,

            couponCodeApplied: quote?.couponCodeApplied || null,
            discountBreakdown: quote?.discountBreakdown || { couponDiscountCents: 0, globalDiscountCents: 0 },
        });

    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });

    }
}

async function mine(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const orders = await listMyOrders(userId);
        return res.json({ orders });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function payDemo(req, res) {
    try {
        if (process.env.NODE_ENV === "production") {
            return res.status(404).json({ message: "Not found" });
        }

        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        const order = await demoMarkPaid(userId, id);

        return res.json({ orderId: order._id, status: order.status });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

function parsePagination(query) {
    const pageRaw = Number(query?.page || 1);
    const limitRaw = Number(query?.limit || 20);

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 20;

    return { page, limit };
}

function parseOptionalInt(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;

    const v = Math.trunc(n);
    if (v < min || v > max) return undefined;

    return v;
}

async function adminStats(req, res) {
    try {
        const rangeRaw = req.query?.range ? String(req.query.range).trim() : "week";
        const yearRaw = req.query?.year != null ? String(req.query.year).trim() : null;

        const year = yearRaw && /^[0-9]{4}$/.test(yearRaw) ? Number(yearRaw) : null;

        const result = await adminGetDashboardStats({ range: rangeRaw, year });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminStatsYears(req, res) {
    try {
        const result = await adminGetDashboardYears();
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminSoldProducts(req, res) {
    try {
        const year = parseOptionalInt(req.query?.year, 2000, 3000);
        const month = parseOptionalInt(req.query?.month, 1, 12);

        if (month && !year) {
            return res.status(400).json({
                message: "Validation error",
                errors: { year: "Per filtrare per mese devi selezionare anche l'anno" },
            });
        }

        const result = await adminGetSoldProducts({ year, month });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminSetStatus(req, res) {
    try {
        const { id } = req.params;
        const newStatus = req.body?.status ? String(req.body.status).trim() : "";

        if (!newStatus) {
            return res.status(400).json({
                message: "Validation error",
                errors: { status: "Status richiesto" },
            });
        }

        const shipmentRaw = req.body?.shipment;
        const shipmentObj = shipmentRaw && typeof shipmentRaw === "object" ? shipmentRaw : null;

        const carrierName = clipStr(shipmentObj?.carrierName, 60);
        let trackingCode = clipStr(shipmentObj?.trackingCode, 120);
        let trackingUrl = clipStr(shipmentObj?.trackingUrl, 500);

        // trackingCode NON deve essere un link
        if (trackingCode && looksLikeUrl(trackingCode)) {
            return res.status(400).json({
                message: "Validation error",
                errors: { shipment: "Il codice tracking non può essere un link" },
            });
        }

        // trackingUrl deve essere un URL valido (http/https). Se manca schema, aggiungiamo https://
        if (trackingUrl) {
            trackingUrl = normalizeUrlInput(trackingUrl);
            if (!isValidHttpUrl(trackingUrl)) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: { shipment: "Link tracking non valido" },
                });
            }
        }

        const hasTracking = Boolean(trackingCode) || Boolean(trackingUrl);

        const shipment =
            carrierName || trackingCode || trackingUrl
                ? { carrierName, trackingCode, trackingUrl }
                : null;

        if (newStatus === "shipped" && !hasTracking) {
            return res.status(400).json({
                message: "Validation error",
                errors: { shipment: "Inserisci almeno codice tracking o link tracking" },
            });
        }

        const order = await adminSetOrderStatus(id, newStatus, shipment);

        return res.json({
            orderId: order._id,
            status: order.status,
            shipment: order.shipment || null,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminSendBankReminder(req, res) {
    try {
        const { id } = req.params;

        const order = await adminSendBankReminderService(id);

        return res.json({
            orderId: order._id,
            status: order.status,
            paymentReminderSentAt: order.paymentReminderSentAt || null,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminList(req, res) {
    try {
        const { page, limit } = parsePagination(req.query);
        const status = req.query?.status ? String(req.query.status).trim() : undefined;
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        const year = parseOptionalInt(req.query?.year, 2000, 3000);
        const month = parseOptionalInt(req.query?.month, 1, 12);
        const week = parseOptionalInt(req.query?.week, 1, 53);

        if ((month || week) && !year) {
            return res.status(400).json({
                message: "Validation error",
                errors: { year: "Per filtrare per mese o settimana devi selezionare anche l'anno" },
            });
        }

        if (month && week) {
            return res.status(400).json({
                message: "Validation error",
                errors: { date: "Puoi filtrare per mese oppure per settimana, non entrambi insieme" },
            });
        }

        const result = await adminListOrders({ page, limit, status, q, year, month, week });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminGet(req, res) {
    try {
        const { id } = req.params;
        const order = await adminGetOrder(id);
        return res.json({ order });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminCancel(req, res) {
    try {
        const { id } = req.params;

        await adminCancelOrderAndRestock(id);

        const order = await Order.findById(id).lean();
        if (!order) {
            return res.status(404).json({ message: "Order not found after cancel" });
        }

        return res.json({ order });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

module.exports = {
    quote,
    create,
    mine,
    payDemo,
    adminList,
    adminGet,
    adminSetStatus,
    adminSendBankReminder,
    adminStats,
    adminCancel,
    adminStatsYears,
    adminSoldProducts,
};