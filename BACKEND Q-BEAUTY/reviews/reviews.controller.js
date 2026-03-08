const { sendAdminNewReviewEmail } = require("../utils/mailer");

const {
    listPublicReviews,
    listAdminReviews,
    getAdminReviewById,
    createReviewForUser,
    approveReview,
    rejectReview,
} = require("./reviews.services");

async function listPublic(req, res) {
    try {
        const page = Number(req.query?.page || 1);
        const limit = Number(req.query?.limit || 7);

        const result = await listPublicReviews({ page, limit });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function create(req, res) {
    try {
        const userId = req.user?.sub || req.user?._uid;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const review = await createReviewForUser(userId, req.body);

        sendAdminNewReviewEmail({ review }).catch((err) => {
            console.error("Admin new review email fallita:", err?.message || err);
        });

        return res.status(201).json({
            message: "Recensione inviata e in attesa di approvazione",
            review,
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
        const page = Number(req.query?.page || 1);
        const limit = Number(req.query?.limit || 20);
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        let approved;
        if (req.query?.approved === "true") approved = true;
        else if (req.query?.approved === "false") approved = false;

        const result = await listAdminReviews({ page, limit, q, approved });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminGet(req, res) {
    try {
        const review = await getAdminReviewById(req.params.id);
        return res.json({ review });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminApprove(req, res) {
    try {
        const adminUserId = req.user?.sub || req.user?._uid;
        if (!adminUserId) return res.status(401).json({ message: "Unauthorized" });

        const review = await approveReview(req.params.id, adminUserId);
        return res.json({
            message: "Recensione approvata",
            review,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminReject(req, res) {
    try {
        const result = await rejectReview(req.params.id);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

module.exports = {
    listPublic,
    create,
    adminList,
    adminGet,
    adminApprove,
    adminReject,
};