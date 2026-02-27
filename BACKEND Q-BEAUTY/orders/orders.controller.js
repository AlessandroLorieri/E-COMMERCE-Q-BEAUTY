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
} = require("./orders.services");

const Order = require("./orders.schema");

const { validateCreateOrderBody, validateQuoteBody } = require("./validators/createOrder.validator");

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

        const { items, shippingAddress, shippingAddressId, couponCode } = req.body || {};
        const { order, quote } = await createOrder(userId, items, shippingAddress, shippingAddressId, couponCode);

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

        const carrierName = shipmentObj?.carrierName != null ? String(shipmentObj.carrierName).trim() : "";
        const trackingCode = shipmentObj?.trackingCode != null ? String(shipmentObj.trackingCode).trim() : "";
        const trackingUrl = shipmentObj?.trackingUrl != null ? String(shipmentObj.trackingUrl).trim() : "";

        const shipment =
            carrierName || trackingCode || trackingUrl
                ? { carrierName, trackingCode, trackingUrl }
                : null;

        if (newStatus === "shipped" && !shipment) {
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

async function adminList(req, res) {
    try {
        const { page, limit } = parsePagination(req.query);
        const status = req.query?.status ? String(req.query.status).trim() : undefined;
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        const result = await adminListOrders({ page, limit, status, q });
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
    adminStats,
    adminCancel,
    adminStatsYears,
};