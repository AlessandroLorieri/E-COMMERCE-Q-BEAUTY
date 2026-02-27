
const mongoose = require("mongoose");
const Product = require("./products.schema");

async function listActiveProducts() {
    return Product.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
}

async function getProductsByIds(productIds) {
    const ids = [...new Set(productIds)].map(String).filter(Boolean);
    if (ids.length === 0) return [];

    const objectIds = ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const slugs = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));

    return Product.find({
        isActive: true,
        $or: [
            ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
            ...(slugs.length ? [{ productId: { $in: slugs } }] : []),
        ],
    }).lean();
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIdQuery(idOrProductId) {
    const raw = String(idOrProductId || "").trim();
    if (!raw) return null;

    if (mongoose.Types.ObjectId.isValid(raw)) {
        return { _id: raw };
    }
    return { productId: raw };
}

function normalizeOptionalString(v) {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const s = String(v).trim();
    return s ? s : null;
}

function normalizeOptionalCents(v) {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.trunc(n);
}

function normalizeStringArray(v) {
    if (v === undefined) return undefined;
    if (v === null) return [];
    if (!Array.isArray(v)) return null;
    return v.map((x) => String(x).trim()).filter(Boolean);
}

function validateOptionalUrl(url) {
    if (url === undefined) return true;
    if (url === null) return true;
    const s = String(url).trim();
    if (!s) return true;
    try {
        const u = new URL(s);
        if (u.protocol !== "http:" && u.protocol !== "https:") return false;
        return true;
    } catch {
        return false;
    }
}

function validateHttpUrlString(s) {
    const raw = String(s ?? "").trim();
    if (!raw) return false;
    try {
        const u = new URL(raw);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function validateHttpUrlArray(arr) {
    if (arr === undefined) return true;
    if (arr === null) return true;
    if (!Array.isArray(arr)) return false;
    for (const s of arr) {
        if (!validateHttpUrlString(s)) return false;
    }
    return true;
}

function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function badgeReset() {
    return {
        enabled: false,
        privateText: null,
        pivaText: null,
        bgColor: null,
        textColor: null,
    };
}

function normalizeBadgeForCreate(v) {
    if (v === undefined) return undefined;
    if (v === null) return badgeReset();
    if (!isPlainObject(v)) return null;

    const enabled = v.enabled === undefined ? false : Boolean(v.enabled);

    const privateText = normalizeOptionalString(v.privateText);
    const pivaText = normalizeOptionalString(v.pivaText);

    const bgColor = normalizeOptionalString(v.bgColor);
    const textColor = normalizeOptionalString(v.textColor);

    return {
        enabled,
        privateText: privateText ?? null,
        pivaText: pivaText ?? null,
        bgColor: bgColor ?? null,
        textColor: textColor ?? null,
    };
}

async function getActiveProductById(idOrProductId) {
    const query = buildIdQuery(idOrProductId);
    if (!query) {
        const err = new Error("Product id required");
        err.status = 400;
        throw err;
    }

    const product = await Product.findOne({ ...query, isActive: true }).lean();
    if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
    }
    return product;
}

async function adminGetProductById(idOrProductId) {
    const query = buildIdQuery(idOrProductId);
    if (!query) {
        const err = new Error("Product id required");
        err.status = 400;
        throw err;
    }

    const product = await Product.findOne(query).lean();
    if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
    }
    return product;
}

async function adminListProducts({ page = 1, limit = 20, q } = {}) {
    const filter = {};

    if (q) {
        const query = String(q).trim();
        if (query) {
            const rx = new RegExp(escapeRegExp(query), "i");
            filter.$or = [{ name: rx }, { productId: rx }];
        }
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean();

    return {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
        products,
    };
}

async function createProduct(payload) {
    const errors = {};

    const productId = payload?.productId == null ? "" : String(payload.productId).trim();
    const name = payload?.name == null ? "" : String(payload.name).trim();

    const priceCents = Number(payload?.priceCents);
    const compareAtNorm = normalizeOptionalCents(payload?.compareAtPriceCents);
    const stockQty = Number(payload?.stockQty);
    const isActive = payload?.isActive === undefined ? true : Boolean(payload.isActive);

    const sortOrderRaw = payload?.sortOrder;
    const sortOrder =
        sortOrderRaw === undefined || sortOrderRaw === null || sortOrderRaw === ""
            ? 9999
            : Number(sortOrderRaw);

    const imageUrl = normalizeOptionalString(payload?.imageUrl);
    const galleryNorm = normalizeStringArray(payload?.galleryImageUrls);
    const shortDesc = normalizeOptionalString(payload?.shortDesc);
    const description = normalizeOptionalString(payload?.description);

    const howToNorm = normalizeStringArray(payload?.howTo);
    const ingredientsNorm = normalizeStringArray(payload?.ingredients);

    const badgeNorm = normalizeBadgeForCreate(payload?.badge);

    if (!productId) errors.productId = "productId richiesto";
    if (!name) errors.name = "name richiesto";

    if (!Number.isFinite(priceCents) || priceCents < 0) errors.priceCents = "priceCents non valido";
    if (payload?.compareAtPriceCents !== undefined) {
        if (Number.isNaN(compareAtNorm)) errors.compareAtPriceCents = "compareAtPriceCents non valido";
        else if (compareAtNorm !== null && Number.isFinite(priceCents) && compareAtNorm < priceCents) {
            errors.compareAtPriceCents = "Il prezzo originale deve essere >= del prezzo finale";
        }
    }
    if (!Number.isFinite(stockQty) || stockQty < 0) errors.stockQty = "stockQty non valido";
    if (!Number.isFinite(sortOrder) || sortOrder < 0) errors.sortOrder = "sortOrder non valido";
    if (!validateOptionalUrl(imageUrl)) errors.imageUrl = "URL immagine non valido";

    if (galleryNorm === null) errors.galleryImageUrls = "galleryImageUrls deve essere un array di stringhe";
    else if (galleryNorm !== undefined && !validateHttpUrlArray(galleryNorm)) {
        errors.galleryImageUrls = "Ogni URL in galleryImageUrls deve essere valido (http/https)";
    }

    if (howToNorm === null) errors.howTo = "howTo deve essere un array di stringhe";
    if (ingredientsNorm === null) errors.ingredients = "ingredients deve essere un array di stringhe";

    if (badgeNorm === null) errors.badge = "badge non valido (deve essere un oggetto)";

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    const existing = await Product.findOne({ productId }).lean();
    if (existing) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { productId: "productId già esistente" };
        throw err;
    }

    try {
        const product = await Product.create({
            productId,
            name,
            priceCents: Math.trunc(priceCents),
            ...(compareAtNorm !== undefined ? { compareAtPriceCents: compareAtNorm } : {}),
            stockQty: Math.trunc(stockQty),
            sortOrder: Math.trunc(sortOrder),

            imageUrl: imageUrl ?? null,
            galleryImageUrls: galleryNorm ?? [],
            shortDesc: shortDesc ?? null,
            description: description ?? null,
            howTo: howToNorm ?? [],
            ingredients: ingredientsNorm ?? [],

            ...(badgeNorm !== undefined ? { badge: badgeNorm } : {}),

            isActive,
        });

        return product.toObject();
    } catch (e) {
        if (e && e.code === 11000) {
            const err = new Error("Validation error");
            err.status = 400;
            err.errors = { productId: "productId già esistente" };
            throw err;
        }
        throw e;
    }
}

async function updateProduct(idOrProductId, payload) {
    const query = buildIdQuery(idOrProductId);
    if (!query) {
        const err = new Error("Product id required");
        err.status = 400;
        throw err;
    }

    if (payload?.productId !== undefined) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { productId: "productId non modificabile" };
        throw err;
    }

    const updates = {};
    const errors = {};

    if (payload?.name !== undefined) {
        const v = String(payload.name).trim();
        if (!v) errors.name = "name richiesto";
        else updates.name = v;
    }

    if (payload?.priceCents !== undefined) {
        if (payload.priceCents === null) errors.priceCents = "priceCents non valido";
        else {
            const v = Number(payload.priceCents);
            if (!Number.isFinite(v) || v < 0) errors.priceCents = "priceCents non valido";
            else updates.priceCents = Math.trunc(v);
        }
    }

    if (payload?.compareAtPriceCents !== undefined) {
        const v = normalizeOptionalCents(payload.compareAtPriceCents);

        if (Number.isNaN(v)) {
            errors.compareAtPriceCents = "compareAtPriceCents non valido";
        } else {
            if (v !== null) {
                let finalPrice = updates.priceCents;

                if (finalPrice === undefined) {
                    const current = await Product.findOne(query).select({ priceCents: 1 }).lean();
                    if (!current) {
                        const err = new Error("Product not found");
                        err.status = 404;
                        throw err;
                    }
                    finalPrice = current.priceCents;
                }

                if (v < finalPrice) {
                    errors.compareAtPriceCents = "Il prezzo originale deve essere >= del prezzo finale";
                }
            }

            updates.compareAtPriceCents = v;
        }
    }

    if (payload?.stockQty !== undefined) {
        if (payload.stockQty === null) errors.stockQty = "stockQty non valido";
        else {
            const v = Number(payload.stockQty);
            if (!Number.isFinite(v) || v < 0) errors.stockQty = "stockQty non valido";
            else updates.stockQty = Math.trunc(v);
        }
    }

    if (payload?.sortOrder !== undefined) {
        if (payload.sortOrder === null || payload.sortOrder === "") {
            updates.sortOrder = 9999;
        } else {
            const v = Number(payload.sortOrder);
            if (!Number.isFinite(v) || v < 0) errors.sortOrder = "sortOrder non valido";
            else updates.sortOrder = Math.trunc(v);
        }
    }

    if (payload?.isActive !== undefined) {
        updates.isActive = Boolean(payload.isActive);
    }

    if (payload?.imageUrl !== undefined) {
        const v = normalizeOptionalString(payload.imageUrl);
        if (!validateOptionalUrl(v)) errors.imageUrl = "URL immagine non valido";
        else updates.imageUrl = v;
    }

    if (payload?.galleryImageUrls !== undefined) {
        const v = normalizeStringArray(payload.galleryImageUrls);
        if (v === null) {
            errors.galleryImageUrls = "galleryImageUrls deve essere un array di stringhe";
        } else if (!validateHttpUrlArray(v)) {
            errors.galleryImageUrls = "Ogni URL in galleryImageUrls deve essere valido (http/https)";
        } else {
            updates.galleryImageUrls = v;
        }
    }

    if (payload?.shortDesc !== undefined) {
        updates.shortDesc = normalizeOptionalString(payload.shortDesc);
    }

    if (payload?.description !== undefined) {
        updates.description = normalizeOptionalString(payload.description);
    }

    if (payload?.howTo !== undefined) {
        const v = normalizeStringArray(payload.howTo);
        if (v === null) errors.howTo = "howTo deve essere un array di stringhe";
        else updates.howTo = v;
    }

    if (payload?.ingredients !== undefined) {
        const v = normalizeStringArray(payload.ingredients);
        if (v === null) errors.ingredients = "ingredients deve essere un array di stringhe";
        else updates.ingredients = v;
    }

    if (payload?.badge !== undefined) {
        const b = payload.badge;

        if (b === null) {
            updates.badge = badgeReset();
        } else if (!isPlainObject(b)) {
            errors.badge = "badge non valido (deve essere un oggetto)";
        } else {
            if (b.enabled !== undefined) {
                updates["badge.enabled"] = Boolean(b.enabled);
            }
            if (b.privateText !== undefined) {
                updates["badge.privateText"] = normalizeOptionalString(b.privateText);
            }
            if (b.pivaText !== undefined) {
                updates["badge.pivaText"] = normalizeOptionalString(b.pivaText);
            }
            if (b.bgColor !== undefined) {
                updates["badge.bgColor"] = normalizeOptionalString(b.bgColor);
            }
            if (b.textColor !== undefined) {
                updates["badge.textColor"] = normalizeOptionalString(b.textColor);
            }
        }
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    const product = await Product.findOneAndUpdate(
        query,
        { $set: updates },
        { new: true }
    ).lean();

    if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
    }

    return product;
}

async function deleteProduct(idOrProductId) {
    const query = buildIdQuery(idOrProductId);
    if (!query) {
        const err = new Error("Product id required");
        err.status = 400;
        throw err;
    }

    const product = await Product.findOne(query);
    if (!product) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
    }

    product.isActive = false;
    await product.save();
}

async function hardDeleteProduct(idOrProductId) {
    const query = buildIdQuery(idOrProductId);
    if (!query) {
        const err = new Error("Product id required");
        err.status = 400;
        throw err;
    }

    const result = await Product.deleteOne(query);
    if (!result.deletedCount) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
    }

    return { ok: true };
}

module.exports = {
    listActiveProducts,
    getProductsByIds,

    getActiveProductById,

    adminListProducts,
    adminGetProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    hardDeleteProduct,
};
