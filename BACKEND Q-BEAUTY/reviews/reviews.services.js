const mongoose = require("mongoose");
const crypto = require("crypto");
const Review = require("./reviews.schema");
const User = require("../authorization/authorization.schema");
const Coupon = require("../coupons/coupons.schema");
const Product = require("../products/products.schema");
const { sendReviewRewardEmail } = require("../utils/mailer");

function pickString(v, maxLen = 200) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildReviewRewardCode() {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `REVIEW5-${suffix}`;
}

async function createReviewRewardCoupon({ ownerUserId, reviewId }) {
    if (!mongoose.Types.ObjectId.isValid(String(ownerUserId || ""))) {
        const err = new Error("ownerUserId non valido");
        err.status = 400;
        throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(String(reviewId || ""))) {
        const err = new Error("reviewId non valido");
        err.status = 400;
        throw err;
    }

    const products = await Product.find({ isActive: true }).select("productId").lean();

    const rules = products
        .map((p) => String(p?.productId || "").trim())
        .filter(Boolean)
        .map((productId) => ({
            productId,
            type: "percent",
            value: 5,
        }));

    if (!rules.length) {
        const err = new Error("Nessun prodotto attivo disponibile per creare il coupon premio");
        err.status = 500;
        throw err;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (let attempt = 0; attempt < 10; attempt++) {
        const code = buildReviewRewardCode();

        try {
            const coupon = await Coupon.create({
                code,
                name: "Premio recensione 5%",
                isActive: true,
                startsAt: now,
                endsAt,
                rules,
                ownerUser: new mongoose.Types.ObjectId(String(ownerUserId)),
                sourceReview: new mongoose.Types.ObjectId(String(reviewId)),
                isRewardCoupon: true,
                usedAt: null,
                usedByOrder: null,
                usedByUser: null,
            });

            return coupon;
        } catch (e) {
            if (e && e.code === 11000) continue;
            throw e;
        }
    }

    const err = new Error("Impossibile generare un codice coupon univoco");
    err.status = 500;
    throw err;
}

async function listPublicReviews({ page = 1, limit = 7 } = {}) {
    const safePage = Math.max(1, Math.trunc(Number(page) || 1));
    const safeLimit = Math.min(24, Math.max(1, Math.trunc(Number(limit) || 7)));
    const skip = (safePage - 1) * safeLimit;

    const filter = { approved: true };

    const total = await Review.countDocuments(filter);

    const reviews = await Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select({
            name: 1,
            role: 1,
            city: 1,
            rating: 1,
            text: 1,
            createdAt: 1,
        })
        .lean();

    return {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
        reviews,
    };
}

async function listAdminReviews({ page = 1, limit = 20, q, approved } = {}) {
    const safePage = Math.max(1, Math.trunc(Number(page) || 1));
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit) || 20)));
    const skip = (safePage - 1) * safeLimit;

    const filter = {};

    if (approved === true || approved === false) {
        filter.approved = approved;
    }

    if (q) {
        const rx = new RegExp(escapeRegExp(String(q).trim()), "i");
        filter.$or = [{ name: rx }, { email: rx }, { text: rx }];
    }

    const total = await Review.countDocuments(filter);

    const reviews = await Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean();

    return {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
        reviews,
    };
}

async function getAdminReviewById(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
        const err = new Error("ID non valido");
        err.status = 400;
        throw err;
    }

    const review = await Review.findById(id).lean();
    if (!review) {
        const err = new Error("Review not found");
        err.status = 404;
        throw err;
    }

    return review;
}

async function createReviewForUser(userId, payload) {
    if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) {
        const err = new Error("Utente non valido");
        err.status = 401;
        throw err;
    }

    const user = await User.findById(userId).lean();
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    const pendingReview = await Review.findOne({
        user: userId,
        approved: false,
    })
        .select("_id createdAt")
        .lean();

    if (pendingReview) {
        const err = new Error("Hai già una recensione in attesa di approvazione");
        err.status = 409;
        throw err;
    }

    const name = pickString(payload?.name, 80);
    const text = pickString(payload?.text, 2000);
    const rating = Number(payload?.rating);

    const errors = {};

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        errors.rating = "rating non valido";
    }

    if (!text || text.length < 20) {
        errors.text = "La recensione deve contenere almeno 20 caratteri";
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    const firstName = pickString(user.firstName, 40);
    const lastName = pickString(user.lastName, 40);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const review = await Review.create({
        user: user._id,
        name: name || fullName || user.email,
        email: String(user.email || "").trim().toLowerCase(),
        rating: Math.round(rating),
        text,
        approved: false,
        approvedAt: null,
        approvedBy: null,
        rewardCouponId: null,
        rewardSentAt: null,
    });

    return review.toObject();
}

async function approveReview(reviewId, adminUserId) {
    if (!mongoose.Types.ObjectId.isValid(String(reviewId || ""))) {
        const err = new Error("ID review non valido");
        err.status = 400;
        throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(String(adminUserId || ""))) {
        const err = new Error("Admin non valido");
        err.status = 401;
        throw err;
    }

    const now = new Date();

    const review = await Review.findOneAndUpdate(
        { _id: reviewId, approved: false },
        {
            $set: {
                approved: true,
                approvedAt: now,
                approvedBy: new mongoose.Types.ObjectId(String(adminUserId)),
            },
        },
        { new: true }
    );

    if (!review) {
        const alreadyApproved = await Review.findById(reviewId).select("_id approved").lean();

        if (!alreadyApproved) {
            const err = new Error("Review not found");
            err.status = 404;
            throw err;
        }

        const err = new Error("Review già approvata");
        err.status = 409;
        throw err;
    }

    if (!review.rewardCouponId) {
        const coupon = await createReviewRewardCoupon({
            ownerUserId: review.user,
            reviewId: review._id,
        });

        review.rewardCouponId = coupon._id;
        await review.save();

        try {
            await sendReviewRewardEmail({
                to: review.email,
                name: review.name,
                couponCode: coupon.code,
                percent: 5,
            });

            review.rewardSentAt = new Date();
            await review.save();
        } catch (mailErr) {
            console.error("Invio review reward email fallito:", mailErr?.message || mailErr);
        }
    }

    return review.toObject();
}

async function rejectReview(reviewId) {
    if (!mongoose.Types.ObjectId.isValid(String(reviewId || ""))) {
        const err = new Error("ID review non valido");
        err.status = 400;
        throw err;
    }

    const res = await Review.deleteOne({ _id: reviewId });

    if (res.deletedCount !== 1) {
        const err = new Error("Review not found");
        err.status = 404;
        throw err;
    }

    return { ok: true };
}

module.exports = {
    listPublicReviews,
    listAdminReviews,
    getAdminReviewById,
    createReviewForUser,
    approveReview,
    rejectReview,
};