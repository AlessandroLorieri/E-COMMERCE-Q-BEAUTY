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

function validateRequiredShippingAddressFields(address) {
    const name = String(address?.name || "").trim();
    const surname = String(address?.surname || "").trim();
    const phone = String(address?.phone || "").trim();
    const street = String(address?.address || "").trim();
    const streetNumber = String(address?.streetNumber || "").trim();
    const city = String(address?.city || "").trim();
    const province = String(address?.province || "")
        .trim()
        .toUpperCase();
    const cap = String(address?.cap || "").trim();

    const errors = {};

    if (!name) errors.name = "Nome richiesto";
    if (!surname) errors.surname = "Cognome richiesto";
    if (!phone) errors.phone = "Telefono richiesto";
    if (!street) errors.address = "Indirizzo richiesto";
    if (!streetNumber) errors.streetNumber = "N° civico richiesto";
    if (!city) errors.city = "Città richiesta";

    if (!province) {
        errors.province = "Provincia richiesta";
    } else if (!/^[A-Z]{2}$/.test(province)) {
        errors.province =
            "Provincia non valida: inserisci la sigla di 2 lettere";
    }

    if (!/^\d{5}$/.test(cap)) {
        errors.cap = "CAP non valido (5 cifre)";
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }
}

async function listMyAddresses(userId) {
    return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

async function createAddress(userId, payload) {
    const a = normalizeShippingAddress(payload || {});
    ensureItalyOnly(payload?.country);
    validateRequiredShippingAddressFields(a);

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

async function updateAddress(userId, addressId, payload) {
    const existing = await Address.findOne({ _id: addressId, user: userId });
    if (!existing) {
        const err = new Error("Address not found");
        err.status = 404;
        throw err;
    }

    ensureItalyOnly(payload?.country);

    const normalized = normalizeShippingAddress({
        name: payload?.name ?? existing.name,
        surname: payload?.surname ?? existing.surname,
        email: payload?.email ?? existing.email,
        phone: payload?.phone ?? existing.phone,
        taxCode: payload?.taxCode ?? existing.taxCode,
        address: payload?.address ?? existing.address,
        streetNumber:
            payload?.streetNumber ?? existing.streetNumber,
        city: payload?.city ?? existing.city,
        province:
            payload?.province ?? existing.province,
        cap: payload?.cap ?? existing.cap,
    });

    validateRequiredShippingAddressFields(normalized);

    existing.name = normalized.name;
    existing.surname = normalized.surname;
    existing.email = normalized.email;
    existing.phone = normalized.phone;
    existing.taxCode = normalized.taxCode;
    existing.address = normalized.address;
    existing.streetNumber = normalized.streetNumber;
    existing.city = normalized.city;
    existing.province = normalized.province;
    existing.cap = normalized.cap;

    if (payload?.label !== undefined) {
        existing.label = String(payload.label || "").trim();
    }

    await existing.save();
    return existing.toObject();
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

module.exports = { listMyAddresses, createAddress, updateAddress, setDefaultAddress };
