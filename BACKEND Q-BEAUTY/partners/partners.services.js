const Partner = require("./partners.schema");
const Order = require("../orders/orders.schema");

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeLower(v) {
    return String(v || "").trim().toLowerCase();
}

function normalizeUpper(v) {
    return String(v || "").trim().toUpperCase();
}

function normalizePartnerCouponCode(v) {
    return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

const VALID_SPENT_STATUS_LIST = [
    "paid",
    "processing",
    "shipped",
    "completed",
];

const VALID_SPENT_STATUSES = new Set(VALID_SPENT_STATUS_LIST);

function sumOrderPieces(order) {
    if (!Array.isArray(order?.items)) return 0;

    return order.items.reduce((sum, item) => {
        return sum + Math.max(0, Math.trunc(Number(item?.qty) || 0));
    }, 0);
}

function mapPartnerOrder(order) {
    const piecesCount = sumOrderPieces(order);
    const isValidSpentStatus = VALID_SPENT_STATUSES.has(String(order?.status || ""));

    return {
        _id: String(order._id),
        publicId: order.publicId || "",
        createdAt: order.createdAt || null,
        status: order.status || "",
        piecesCount,

        subtotalCents: Number(order.subtotalCents) || 0,
        discountCents: Number(order.discountCents) || 0,
        couponDiscountCents: Number(order.couponDiscountCents) || 0,
        globalDiscountCents: Number(order.globalDiscountCents) || 0,
        shippingCents: Number(order.shippingCents) || 0,
        totalCents: Number(order.totalCents) || 0,

        partnerCouponCodeApplied: order.partnerCouponCodeApplied || "",
        partnerActivationEligible: !!order.partnerActivationEligible,
        discountType: order.discountType || "none",

        paymentProvider: order.paymentProvider || "",
        paymentMethodType: order.paymentMethodType || "",
        paymentMethodLabel: order.paymentMethodLabel || "",

        isValidSpentStatus,

        items: Array.isArray(order.items)
            ? order.items.map((item) => ({
                productId: item.productId || "",
                productSlug: item.productSlug || "",
                name: item.name || "",
                qty: Number(item.qty) || 0,
                unitPriceCents: Number(item.unitPriceCents) || 0,
                lineTotalCents: Number(item.lineTotalCents) || 0,
                couponDiscountCents: Number(item.couponDiscountCents) || 0,
            }))
            : [],
    };
}

function normalizeCap(v) {
    return String(v || "").replace(/\D/g, "").trim();
}

function normalizeUrl(v) {
    const raw = String(v || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
}

function parseBoolean(v, fallback = false) {
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return fallback;
}

function parseNumberOrNull(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function parseInteger(v, fallback = 0) {
    if (v === "" || v == null) return fallback;
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
}

function parseTextList(value) {
    if (Array.isArray(value)) {
        return value
            .map((v) => normalizeText(v))
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n|,/)
            .map((v) => normalizeText(v))
            .filter(Boolean);
    }

    return [];
}

function normalizePartnerPayload(payload = {}) {
    return {
        name: normalizeText(payload.name),
        contactPersonName: normalizeText(payload.contactPersonName),
        slug: normalizeLower(payload.slug),
        address: normalizeText(payload.address),
        cap: normalizeCap(payload.cap),
        city: normalizeText(payload.city),
        province: normalizeUpper(payload.province),
        region: normalizeText(payload.region),
        lat: parseNumberOrNull(payload.lat),
        lng: parseNumberOrNull(payload.lng),
        phone: normalizeText(payload.phone),
        email: normalizeLower(payload.email),
        partnerCouponCode: normalizePartnerCouponCode(payload.partnerCouponCode),
        partnerCouponEnabled: parseBoolean(payload.partnerCouponEnabled, false),
        website: normalizeUrl(payload.website),
        instagram: normalizeUrl(payload.instagram),
        personalInstagram: normalizeUrl(payload.personalInstagram),
        services: parseTextList(payload.services),
        treatments: parseTextList(payload.treatments),
        description: normalizeText(payload.description),
        image: normalizeUrl(payload.image),
        gallery: parseTextList(payload.gallery).map((v) => normalizeUrl(v)),
        isActive: parseBoolean(payload.isActive, true),
        sortOrder: parseInteger(payload.sortOrder, 0),
    };
}

function validatePartnerPayload(data) {
    const errors = {};

    const isPublicPartner = data.isActive === true;
    const partnerCouponEnabled = data.partnerCouponEnabled === true;
    const hasPartnerCouponCode = !!String(data.partnerCouponCode || "").trim();

    // Campi minimi sempre obbligatori, anche per bozza/non visibile
    if (!data.name) errors.name = "Nome richiesto";
    if (!data.slug) errors.slug = "Slug richiesto";

    // Se abiliti il codice partner, il codice deve esserci
    if (partnerCouponEnabled && !hasPartnerCouponCode) {
        errors.partnerCouponCode = "Inserisci un codice partner oppure disattiva il codice partner";
    }

    // Campi obbligatori solo quando il partner è visibile nello shop
    if (isPublicPartner) {
        if (!data.address) errors.address = "Indirizzo richiesto";
        if (!data.city) errors.city = "Città richiesta";
        if (!data.province) errors.province = "Provincia richiesta";
        if (!data.region) errors.region = "Regione richiesta";
        if (!data.description) errors.description = "Descrizione richiesta";
        if (!data.image) errors.image = "Immagine principale richiesta";

        if (!Array.isArray(data.services) || data.services.length === 0) {
            errors.services = "Inserisci almeno un servizio";
        }
    }

    if (!/^[a-z0-9-]+$/.test(String(data.slug || ""))) {
        errors.slug = "Slug non valido (usa solo lettere minuscole, numeri e trattini)";
    }

    if (data.cap && !/^\d{5}$/.test(String(data.cap))) {
        errors.cap = "CAP non valido (5 cifre)";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
        errors.email = "Email non valida";
    }

    if (data.partnerCouponCode && !/^[A-Z0-9_-]{4,40}$/.test(String(data.partnerCouponCode))) {
        errors.partnerCouponCode = "Codice partner non valido (usa 4-40 caratteri: lettere, numeri, _ o -)";
    }

    if (data.website && !/^https?:\/\//i.test(String(data.website))) {
        errors.website = "URL sito non valido";
    }

    if (data.instagram && !/^https?:\/\//i.test(String(data.instagram))) {
        errors.instagram = "URL Instagram non valido";
    }

    if (data.personalInstagram && !/^https?:\/\//i.test(String(data.personalInstagram))) {
        errors.personalInstagram = "URL Instagram personale non valido";
    }

    if (data.lat != null) {
        if (!Number.isFinite(Number(data.lat))) {
            errors.lat = "Latitudine non valida";
        } else if (Number(data.lat) < -90 || Number(data.lat) > 90) {
            errors.lat = "Latitudine fuori intervallo";
        }
    }

    if (data.lng != null) {
        if (!Number.isFinite(Number(data.lng))) {
            errors.lng = "Longitudine non valida";
        } else if (Number(data.lng) < -180 || Number(data.lng) > 180) {
            errors.lng = "Longitudine fuori intervallo";
        }
    }

    if (data.sortOrder != null && !Number.isInteger(Number(data.sortOrder))) {
        errors.sortOrder = "Ordine non valido";
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }
}

async function ensureUniqueSlug(slug, excludeId = null) {
    const query = excludeId
        ? { slug, _id: { $ne: excludeId } }
        : { slug };

    const exists = await Partner.exists(query);
    if (exists) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { slug: "Slug già esistente" };
        throw err;
    }
}

async function ensureUniquePartnerCouponCode(partnerCouponCode, excludeId = null) {
    const code = normalizePartnerCouponCode(partnerCouponCode);
    if (!code) return;

    const query = excludeId
        ? { partnerCouponCode: code, _id: { $ne: excludeId } }
        : { partnerCouponCode: code };

    const exists = await Partner.exists(query);
    if (exists) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { partnerCouponCode: "Codice partner già esistente" };
        throw err;
    }
}

async function listPublicPartners() {
    return Partner.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .lean();
}

async function getPublicPartnerBySlug(slugRaw) {
    const slug = normalizeLower(slugRaw);

    const partner = await Partner.findOne({ slug, isActive: true }).lean();
    if (!partner) {
        const err = new Error("Partner not found");
        err.status = 404;
        throw err;
    }

    return partner;
}

async function adminListPartners() {
    return Partner.find({})
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();
}

async function adminGetPartner(id) {
    const partner = await Partner.findById(id).lean();
    if (!partner) {
        const err = new Error("Partner not found");
        err.status = 404;
        throw err;
    }

    return partner;
}

async function adminGetPartnerOrders(id) {
    const partner = await Partner.findById(id).lean();

    if (!partner) {
        const err = new Error("Partner not found");
        err.status = 404;
        throw err;
    }

    const orConditions = [{ partnerRef: partner._id }];

    const couponCode = normalizePartnerCouponCode(partner.partnerCouponCode);

    if (couponCode) {
        orConditions.push({ partnerCouponCodeApplied: couponCode });
    }

    const orders = await Order.find({
        status: { $in: VALID_SPENT_STATUS_LIST },
        $or: orConditions,
    })
        .sort({ createdAt: -1 })
        .select({
            publicId: 1,
            createdAt: 1,
            status: 1,
            items: 1,

            subtotalCents: 1,
            discountCents: 1,
            couponDiscountCents: 1,
            globalDiscountCents: 1,
            shippingCents: 1,
            totalCents: 1,

            partnerRef: 1,
            partnerCouponCodeApplied: 1,
            partnerName: 1,
            partnerActivationEligible: 1,
            discountType: 1,

            paymentProvider: 1,
            paymentMethodType: 1,
            paymentMethodLabel: 1,
        })
        .lean();

    const mappedOrders = orders.map(mapPartnerOrder);

    const validOrders = mappedOrders.filter((order) => order.isValidSpentStatus);

    const summary = validOrders.reduce(
        (acc, order) => {
            acc.ordersCount += 1;
            acc.piecesCount += Number(order.piecesCount) || 0;
            acc.spentCents += Number(order.totalCents) || 0;

            if (!acc.lastOrderAt || new Date(order.createdAt) > new Date(acc.lastOrderAt)) {
                acc.lastOrderAt = order.createdAt;
            }

            return acc;
        },
        {
            ordersCount: 0,
            piecesCount: 0,
            spentCents: 0,
            lastOrderAt: null,
        }
    );

    return {
        partner: {
            _id: String(partner._id),
            name: partner.name || "",
            partnerCouponCode: partner.partnerCouponCode || "",
        },
        summary,
        orders: mappedOrders,
    };
}

async function adminGetPartnerLeaderboard() {
    const partners = await Partner.find({})
        .select("_id partnerCouponCode")
        .lean();

    const partnerIds = new Set(
        partners.map((partner) => String(partner._id))
    );

    const partnerIdByCouponCode = new Map();

    for (const partner of partners) {
        const couponCode = normalizePartnerCouponCode(
            partner.partnerCouponCode
        );

        if (couponCode) {
            partnerIdByCouponCode.set(
                couponCode,
                String(partner._id)
            );
        }
    }

    const orders = await Order.find({
        status: { $in: VALID_SPENT_STATUS_LIST },
        $or: [
            { partnerRef: { $ne: null } },
            { partnerCouponCodeApplied: { $nin: [null, ""] } },
        ],
    })
        .select({
            partnerRef: 1,
            partnerCouponCodeApplied: 1,
            items: 1,
            totalCents: 1,
        })
        .lean();

    const totalsByPartnerId = new Map();

    for (const order of orders) {
        const partnerRefId = order.partnerRef
            ? String(order.partnerRef)
            : "";

        const couponCode = normalizePartnerCouponCode(
            order.partnerCouponCodeApplied
        );

        const partnerId =
            (partnerRefId && partnerIds.has(partnerRefId)
                ? partnerRefId
                : "") ||
            partnerIdByCouponCode.get(couponCode) ||
            "";

        if (!partnerId) continue;

        const current = totalsByPartnerId.get(partnerId) || {
            piecesCount: 0,
            spentCents: 0,
        };

        current.piecesCount += sumOrderPieces(order);
        current.spentCents += Math.max(
            0,
            Number(order.totalCents) || 0
        );

        totalsByPartnerId.set(partnerId, current);
    }

    const rows = Array.from(totalsByPartnerId.entries()).map(
        ([partnerId, totals]) => ({
            partnerId,
            piecesCount: totals.piecesCount,
            spentCents: totals.spentCents,
        })
    );

    const topPiecesCount = rows.reduce(
        (max, row) => Math.max(max, row.piecesCount),
        0
    );

    const topSpentCents = rows.reduce(
        (max, row) => Math.max(max, row.spentCents),
        0
    );

    return {
        topPiecesCount,
        topSpentCents,

        topPiecesPartnerIds:
            topPiecesCount > 0
                ? rows
                    .filter(
                        (row) =>
                            row.piecesCount === topPiecesCount
                    )
                    .map((row) => row.partnerId)
                : [],

        topSpentPartnerIds:
            topSpentCents > 0
                ? rows
                    .filter(
                        (row) =>
                            row.spentCents === topSpentCents
                    )
                    .map((row) => row.partnerId)
                : [],
    };
}

async function createPartner(payload) {
    const data = normalizePartnerPayload(payload);
    validatePartnerPayload(data);
    await ensureUniqueSlug(data.slug);
    await ensureUniquePartnerCouponCode(data.partnerCouponCode);

    const created = await Partner.create(data);
    return created.toObject();
}

async function updatePartner(id, payload) {
    const existing = await Partner.findById(id);
    if (!existing) {
        const err = new Error("Partner not found");
        err.status = 404;
        throw err;
    }

    const data = normalizePartnerPayload({
        name: payload.name ?? existing.name,
        contactPersonName: payload.contactPersonName ?? existing.contactPersonName,
        slug: payload.slug ?? existing.slug,
        address: payload.address ?? existing.address,
        cap: payload.cap ?? existing.cap,
        city: payload.city ?? existing.city,
        province: payload.province ?? existing.province,
        region: payload.region ?? existing.region,
        lat: payload.lat ?? existing.lat,
        lng: payload.lng ?? existing.lng,
        phone: payload.phone ?? existing.phone,
        email: payload.email ?? existing.email,
        partnerCouponCode: payload.partnerCouponCode ?? existing.partnerCouponCode,
        partnerCouponEnabled: payload.partnerCouponEnabled ?? existing.partnerCouponEnabled,
        website: payload.website ?? existing.website,
        instagram: payload.instagram ?? existing.instagram,
        personalInstagram: payload.personalInstagram ?? existing.personalInstagram,
        services: payload.services ?? existing.services,
        treatments: payload.treatments ?? existing.treatments,
        description: payload.description ?? existing.description,
        image: payload.image ?? existing.image,
        gallery: payload.gallery ?? existing.gallery,
        isActive: payload.isActive ?? existing.isActive,
        sortOrder: payload.sortOrder ?? existing.sortOrder,
    });

    validatePartnerPayload(data);
    await ensureUniqueSlug(data.slug, existing._id);
    await ensureUniquePartnerCouponCode(data.partnerCouponCode, existing._id);


    Object.assign(existing, data);
    await existing.save();

    return existing.toObject();
}

async function deletePartner(id) {
    const partner = await Partner.findById(id);
    if (!partner) {
        const err = new Error("Partner not found");
        err.status = 404;
        throw err;
    }

    await Partner.deleteOne({ _id: partner._id });
    return { ok: true };
}

module.exports = {
    normalizePartnerPayload,
    validatePartnerPayload,
    listPublicPartners,
    getPublicPartnerBySlug,
    adminListPartners,
    adminGetPartner,
    adminGetPartnerOrders,
    adminGetPartnerLeaderboard,
    createPartner,
    updatePartner,
    deletePartner,
};