const Address = require("./addresses.schema");
const { normalizeShippingAddress } = require("../utils/normalizers/address.normalizer");

const ALLOWED_COUNTRY = "IT";

function normalizeCountry(v) {
    const raw = String(v || "").trim().toUpperCase();

    if (!raw) return ALLOWED_COUNTRY;
    if (raw === "ITALIA" || raw === "ITALY") return ALLOWED_COUNTRY;

    return raw;
}

function ensureItalyOnly(countryRaw) {
    const country = normalizeCountry(countryRaw);

    if (country !== ALLOWED_COUNTRY) {
        const err = new Error("Spediamo solo in Italia");
        err.status = 400;
        throw err;
    }

    return country;
}

async function listMyAddresses(userId) {
    return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

async function createAddress(userId, payload) {
    const a = normalizeShippingAddress(payload || {});
    ensureItalyOnly(payload?.country);

    const existingCount = await Address.countDocuments({ user: userId });

    // isDefault robusto (gestisce true/false anche se arrivano come stringhe)
    const rawDefault = payload?.isDefault;
    const wantsDefault =
        rawDefault === true ||
        rawDefault === "true" ||
        rawDefault === 1 ||
        rawDefault === "1";

    const isDefault = existingCount === 0 ? true : wantsDefault;

    const created = await Address.create({
        user: userId,
        ...a,
        label: String(payload?.label || "").trim(),
        isDefault,
    });

    // Se questo indirizzo è default, disattiva gli altri DOPO aver creato (così non resti mai senza default)
    if (isDefault) {
        await Address.updateMany(
            { user: userId, _id: { $ne: created._id } },
            { $set: { isDefault: false } }
        );
    }

    return created;
}

async function setDefaultAddress(userId, addressId) {
    // prima settiamo QUESTO come default (se non esiste o non è dell’utente → 404)
    const r = await Address.updateOne(
        { _id: addressId, user: userId },
        { $set: { isDefault: true } }
    );

    if (!r || r.matchedCount === 0) {
        const err = new Error("Address not found");
        err.status = 404;
        throw err;
    }

    // poi togliamo il default agli altri (così non resti mai senza default)
    await Address.updateMany(
        { user: userId, _id: { $ne: addressId } },
        { $set: { isDefault: false } }
    );

    return Address.findOne({ _id: addressId, user: userId }).lean();
}

module.exports = { listMyAddresses, createAddress, setDefaultAddress };
