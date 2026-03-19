const ShopSettings = require("../models/shopSettings.model");

const SETTINGS_KEY = "main";
const DEFAULT_SHIPPING_CENTS = 700;
const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 12000;

function toSafeSettingsObject(doc) {
    return {
        key: doc.key,
        shippingCents: Number(doc.shippingCents || 0),
        freeShippingThresholdCents: Number(doc.freeShippingThresholdCents || 0),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

async function getOrCreateMainSettings() {
    let settings = await ShopSettings.findOne({ key: SETTINGS_KEY });

    if (!settings) {
        settings = await ShopSettings.create({
            key: SETTINGS_KEY,
            shippingCents: DEFAULT_SHIPPING_CENTS,
            freeShippingThresholdCents: DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS,
        });
    }

    return settings;
}

function parseNonNegativeInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.trunc(n);
}

async function getShippingSettings() {
    const settings = await getOrCreateMainSettings();
    return toSafeSettingsObject(settings);
}

async function updateShippingSettings(payload) {
    const settings = await getOrCreateMainSettings();

    const errors = {};
    const hasShippingCents = Object.prototype.hasOwnProperty.call(payload || {}, "shippingCents");
    const hasFreeThreshold = Object.prototype.hasOwnProperty.call(payload || {}, "freeShippingThresholdCents");

    if (!hasShippingCents && !hasFreeThreshold) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = {
            shippingCents: "Nessun campo da aggiornare",
        };
        throw err;
    }

    if (hasShippingCents) {
        const n = parseNonNegativeInt(payload.shippingCents);
        if (Number.isNaN(n)) {
            errors.shippingCents = "shippingCents deve essere un intero >= 0";
        } else {
            settings.shippingCents = n;
        }
    }

    if (hasFreeThreshold) {
        const n = parseNonNegativeInt(payload.freeShippingThresholdCents);
        if (Number.isNaN(n)) {
            errors.freeShippingThresholdCents = "freeShippingThresholdCents deve essere un intero >= 0";
        } else {
            settings.freeShippingThresholdCents = n;
        }
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    await settings.save();
    return toSafeSettingsObject(settings);
}

module.exports = {
    getShippingSettings,
    updateShippingSettings,
};