const { createCoupon, updateCoupon, listCoupons, getCoupon, deleteCoupon } = require("./coupons.services");

function parsePagination(query) {
    const pageRaw = Number(query?.page || 1);
    const limitRaw = Number(query?.limit || 20);

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 20;

    return { page, limit };
}

async function adminList(req, res) {
    try {
        const { page, limit } = parsePagination(req.query);
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        const result = await listCoupons({ page, limit, q });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminGet(req, res) {
    try {
        const { id } = req.params;
        const coupon = await getCoupon(id);
        return res.json({ coupon });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error", errors: err.errors });
    }
}

async function adminCreate(req, res) {
    try {
        const coupon = await createCoupon(req.body);
        return res.status(201).json({ coupon });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error", errors: err.errors });
    }
}

async function adminUpdate(req, res) {
    try {
        const { id } = req.params;
        const coupon = await updateCoupon(id, req.body);
        return res.json({ coupon });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error", errors: err.errors });
    }
}

async function adminDelete(req, res) {
    try {
        const { id } = req.params;
        await deleteCoupon(id);
        return res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error", errors: err.errors });
    }
}

module.exports = { adminList, adminGet, adminCreate, adminUpdate, adminDelete };

