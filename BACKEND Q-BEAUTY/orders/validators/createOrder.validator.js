function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
}

function normalizeCouponCode(v) {
    return typeof v === "string" ? v.trim() : "";
}

function isCouponCode(v) {
    const code = normalizeCouponCode(v);
    if (!code) return false;
    return /^[A-Za-z0-9_-]{3,32}$/.test(code);
}

function isEmail(v) {
    if (!isNonEmptyString(v)) return false;
    return /^\S+@\S+\.\S+$/.test(v.trim());
}

function isCap(v) {
    if (!isNonEmptyString(v)) return false;
    return /^\d{5}$/.test(v.trim());
}

function isPhone(v) {
    if (!isNonEmptyString(v)) return false;
    const digits = v.replace(/[^\d]/g, "");
    return digits.length >= 7 && digits.length <= 15;
}


function isObjectId(v) {
    if (!isNonEmptyString(v)) return false;
    return /^[a-fA-F0-9]{24}$/.test(v.trim());
}

function validateItems(items) {
    const errors = {};

    if (!Array.isArray(items) || items.length === 0) {
        errors.items = "items deve essere un array non vuoto";
        return errors;
    }

    const itemErrors = [];
    items.forEach((it, idx) => {
        const e = {};
        if (!isNonEmptyString(it?.productId)) e.productId = "productId richiesto";
        const qty = Number(it?.qty);
        if (!Number.isInteger(qty) || qty < 1) e.qty = "qty deve essere un intero >= 1";
        if (Object.keys(e).length) itemErrors[idx] = e;
    });

    if (itemErrors.length) errors.itemErrors = itemErrors;
    return errors;
}

function validateQuoteBody(body) {
    const errors = validateItems(body?.items);

    if (Object.prototype.hasOwnProperty.call(body || {}, "couponCode")) {
        const raw = body?.couponCode;

        if (typeof raw === "string" && raw.trim() === "") {

        } else if (!isCouponCode(raw)) {
            errors.couponCode = "couponCode non valido (3-32, solo lettere/numeri/_/-)";
        }
    }
    return errors;
}

function normalizeTaxCode(v) {
    return typeof v === "string" ? v.trim().toUpperCase() : "";
}

function isTaxCode(v) {
    const tc = normalizeTaxCode(v);
    if (!tc) return false;
    return /^[A-Z0-9]{16}$/.test(tc) || /^\d{11}$/.test(tc);
}

function validateCreateOrderBody(body) {
    const errors = validateItems(body?.items);

    if (Object.prototype.hasOwnProperty.call(body || {}, "couponCode")) {
        const raw = body?.couponCode;

        if (typeof raw === "string" && raw.trim() === "") {
        } else if (!isCouponCode(raw)) {
            errors.couponCode = "couponCode non valido (3-32, solo lettere/numeri/_/-)";
        }
    }

    const idRaw = body?.shippingAddressId;
    const hasId = isNonEmptyString(idRaw);

    const a = body?.shippingAddress;
    const ship = {};

    const taxRaw =
        a && typeof a === "object" && Object.prototype.hasOwnProperty.call(a, "taxCode")
            ? a.taxCode
            : body?.taxCode;

    if (!isNonEmptyString(taxRaw)) {
        ship.taxCode = "Codice Fiscale richiesto";
    } else if (!isTaxCode(taxRaw)) {
        ship.taxCode = "Codice Fiscale non valido (16 caratteri o 11 cifre)";
    }

    if (hasId) {
        if (!isObjectId(idRaw)) {
            errors.shippingAddressId = "shippingAddressId non valido";
        }

        if (!errors.shippingAddressId) {
            if (Object.keys(ship).length) errors.shippingAddress = ship; 
            return errors;
        }
    }

    if (!a || typeof a !== "object") {
        errors.shippingAddress = "shippingAddress o shippingAddressId richiesto";
        return errors;
    }

    if (!isNonEmptyString(a.name)) ship.name = "Nome richiesto";
    if (!isNonEmptyString(a.surname)) ship.surname = "Cognome richiesto";
    if (!isPhone(a.phone)) ship.phone = "Telefono non valido";
    if (!isNonEmptyString(a.address)) ship.address = "Indirizzo richiesto";
    if (!isNonEmptyString(a.city)) ship.city = "Città richiesta";
    if (!isCap(a.cap)) ship.cap = "CAP non valido (5 cifre)";

    if (Object.keys(ship).length) errors.shippingAddress = ship;

    return errors;
}

module.exports = { validateCreateOrderBody, validateQuoteBody };
