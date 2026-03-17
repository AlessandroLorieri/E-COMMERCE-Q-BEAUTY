function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
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

function normalizeTaxCode(v) {
    return typeof v === "string" ? v.trim().toUpperCase() : "";
}

function isTaxCode(v) {
    const tc = normalizeTaxCode(v);
    if (!tc) return false;
    return /^[A-Z0-9]{16}$/.test(tc) || /^\d{11}$/.test(tc);
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
            // consentito: coupon vuoto = nessun coupon
        } else if (!isCouponCode(raw)) {
            errors.couponCode = "couponCode non valido (3-32, solo lettere/numeri/_/-)";
        }
    }

    return errors;
}

function validateAddressFields(address, { requirePhone = false } = {}) {
    const errors = {};

    if (!isPlainObject(address)) return errors;

    if (!isNonEmptyString(address.name)) errors.name = "Nome richiesto";
    if (!isNonEmptyString(address.surname)) errors.surname = "Cognome richiesto";

    if (requirePhone) {
        if (!isPhone(address.phone)) errors.phone = "Telefono non valido";
    } else if (
        Object.prototype.hasOwnProperty.call(address, "phone") &&
        isNonEmptyString(address.phone) &&
        !isPhone(address.phone)
    ) {
        errors.phone = "Telefono non valido";
    }

    if (
        Object.prototype.hasOwnProperty.call(address, "email") &&
        isNonEmptyString(address.email) &&
        !isEmail(address.email)
    ) {
        errors.email = "Email non valida";
    }

    if (!isNonEmptyString(address.address)) errors.address = "Indirizzo richiesto";
    if (!isNonEmptyString(address.streetNumber)) errors.streetNumber = "N° civico richiesto";
    if (!isNonEmptyString(address.city)) errors.city = "Città richiesta";
    if (!isCap(address.cap)) errors.cap = "CAP non valido (5 cifre)";

    return errors;
}

function validateCreateOrderBody(body) {
    const errors = validateItems(body?.items);

    if (Object.prototype.hasOwnProperty.call(body || {}, "couponCode")) {
        const raw = body?.couponCode;

        if (typeof raw === "string" && raw.trim() === "") {
            // consentito: coupon vuoto = nessun coupon
        } else if (!isCouponCode(raw)) {
            errors.couponCode = "couponCode non valido (3-32, solo lettere/numeri/_/-)";
        }
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, "note")) {
        const rawNote = body?.note;

        if (rawNote != null && typeof rawNote !== "string") {
            errors.note = "note deve essere una stringa";
        } else if (typeof rawNote === "string" && rawNote.trim().length > 500) {
            errors.note = "note troppo lunga (massimo 500 caratteri)";
        }
    }

    const shippingAddressIdRaw = body?.shippingAddressId;
    const hasShippingAddressId = isNonEmptyString(shippingAddressIdRaw);

    const shippingAddress = isPlainObject(body?.shippingAddress) ? body.shippingAddress : null;
    const billingAddress = isPlainObject(body?.billingAddress) ? body.billingAddress : null;

    const globalTaxRaw =
        billingAddress && Object.prototype.hasOwnProperty.call(billingAddress, "taxCode")
            ? billingAddress.taxCode
            : body?.taxCode;

    if (!isNonEmptyString(globalTaxRaw)) {
        errors.taxCode = "Codice Fiscale / P.IVA richiesto";
    } else if (!isTaxCode(globalTaxRaw)) {
        errors.taxCode = "Codice Fiscale / P.IVA non valido (16 caratteri o 11 cifre)";
    }

    if (hasShippingAddressId && !isObjectId(shippingAddressIdRaw)) {
        errors.shippingAddressId = "shippingAddressId non valido";
    }

    if (!hasShippingAddressId && !shippingAddress) {
        errors.shippingAddress = "shippingAddress o shippingAddressId richiesto";
    }

    if (shippingAddress) {
        const shipErrors = validateAddressFields(shippingAddress, { requirePhone: true });
        if (Object.keys(shipErrors).length) {
            errors.shippingAddress = shipErrors;
        }
    }

    if (billingAddress) {
        const billingErrors = validateAddressFields(billingAddress, { requirePhone: false });

        if (Object.prototype.hasOwnProperty.call(billingAddress, "taxCode")) {
            if (!isNonEmptyString(billingAddress.taxCode)) {
                billingErrors.taxCode = "Codice Fiscale richiesto";
            } else if (!isTaxCode(billingAddress.taxCode)) {
                billingErrors.taxCode = "Codice Fiscale non valido (16 caratteri o 11 cifre)";
            }
        }

        if (Object.keys(billingErrors).length) {
            errors.billingAddress = billingErrors;
        }
    }

    return errors;
}

module.exports = { validateCreateOrderBody, validateQuoteBody };