const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("./authorization.schema");
const Address = require("../addresses/addresses.schema");
const Order = require("../orders/orders.schema");
const { normalizeShippingAddress } = require("../utils/normalizers/address.normalizer");


function getSaltRounds() {
    const n = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    if (Number.isNaN(n) || n < 8 || n > 15) return 10;
    return n;
}

function signToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );
}

function normalizeEmail(email) {
    return String(email || "").toLowerCase().trim();
}

function normalizeTaxCode(v) {
    return String(v || "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();
}

function normalizeSdiCode(v) {
    return String(v || "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();
}

function normalizePec(v) {
    return String(v || "")
        .trim()
        .toLowerCase();
}

function escapeRegExp(str) {
    return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeResetToken() {
    return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function registerUser(payload) {
    const {
        email,
        password,
        customerType,
        firstName,
        lastName,
        phone,
        companyName,
        vatNumber,
        taxCode,
        sdiCode,
        pec,
        address,
        streetNumber,
        city,
        cap,
        confirmBusinessData,
    } = payload || {};

    if (!email || !password || !customerType || !firstName || !lastName) {
        const err = new Error("Missing required fields");
        err.status = 400;
        throw err;
    }

    if (!["private", "piva"].includes(customerType)) {
        const err = new Error("Invalid customerType");
        err.status = 400;
        throw err;
    }

    if (String(password).length < 8) {
        const err = new Error("Password must be at least 8 characters");
        err.status = 400;
        throw err;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedPhone = phone ? String(phone).trim() : undefined;
    const normalizedCompanyName = companyName ? String(companyName).trim() : "";
    const normalizedVatNumber = vatNumber ? String(vatNumber).trim() : "";
    const normalizedTaxCode = normalizeTaxCode(taxCode);
    const normalizedSdiCode = normalizeSdiCode(sdiCode);
    const normalizedPec = normalizePec(pec);

    const normalizedAddress = address ? String(address).trim() : "";
    const normalizedStreetNumber = streetNumber ? String(streetNumber).trim() : "";
    const normalizedCity = city ? String(city).trim() : "";
    const normalizedCap = cap ? String(cap).trim() : "";

    const confirmedBusinessData =
        confirmBusinessData === true ||
        confirmBusinessData === "true" ||
        confirmBusinessData === 1 ||
        confirmBusinessData === "1";

    if (customerType === "piva") {
        if (!normalizedCompanyName || !normalizedVatNumber || !normalizedTaxCode) {
            const err = new Error("companyName, vatNumber and taxCode are required for piva");
            err.status = 400;
            throw err;
        }

        if (!normalizedSdiCode && !normalizedPec) {
            const err = new Error("At least one of sdiCode or pec is required for piva");
            err.status = 400;
            throw err;
        }

        if (!normalizedAddress || !normalizedStreetNumber || !normalizedCity || !normalizedCap) {
            const err = new Error("Legal billing address is required for piva");
            err.status = 400;
            throw err;
        }

        if (!confirmedBusinessData) {
            const err = new Error("Business data confirmation required");
            err.status = 400;
            throw err;
        }
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
        const err = new Error("Email already registered");
        err.status = 409;
        throw err;
    }

    const saltRounds = getSaltRounds();
    const passwordHash = await bcrypt.hash(String(password), saltRounds);

    let user = null;
    let billingAddress = null;

    try {
        user = await User.create({
            email: normalizedEmail,
            passwordHash,
            customerType,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            phone: normalizedPhone,
            companyName: customerType === "piva" ? normalizedCompanyName : undefined,
            vatNumber: customerType === "piva" ? normalizedVatNumber : undefined,
            taxCode: customerType === "piva" ? normalizedTaxCode : undefined,
            sdiCode: customerType === "piva" ? (normalizedSdiCode || undefined) : undefined,
            pec: customerType === "piva" ? (normalizedPec || undefined) : undefined,
        });

        if (customerType === "piva") {
            billingAddress = await Address.create({
                user: user._id,
                label: "Sede legale",
                name: normalizedFirstName,
                surname: normalizedLastName,
                phone: normalizedPhone || "",
                email: normalizedEmail,
                taxCode: normalizedTaxCode || "",
                address: normalizedAddress,
                streetNumber: normalizedStreetNumber,
                city: normalizedCity,
                cap: normalizedCap,
            });

            user.billingAddressRef = billingAddress._id;
            await user.save();
        }

        const token = signToken(user);

        return { user: user.toSafeObject(), token };
    } catch (err) {
        if (billingAddress?._id) {
            await Address.deleteOne({ _id: billingAddress._id }).catch(() => { });
        }

        if (user?._id) {
            await User.deleteOne({ _id: user._id }).catch(() => { });
        }

        throw err;
    }
}

async function loginUser(email, password) {
    if (!email || !password) {
        const err = new Error("Missing email or password");
        err.status = 400;
        throw err;
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        const err = new Error("Invalid credentials");
        err.status = 401;
        throw err;
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
        const err = new Error("Invalid credentials");
        err.status = 401;
        throw err;
    }

    const token = signToken(user);
    return { user: user.toSafeObject(), token };
}

async function getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }
    return { user: user.toSafeObject() };
}

async function changePasswordUser(userId, currentPassword, newPassword) {
    const errors = {};

    if (!currentPassword) errors.currentPassword = "Password attuale richiesta";
    if (!newPassword) errors.newPassword = "Nuova password richiesta";
    else if (String(newPassword).length < 8) errors.newPassword = "Minimo 8 caratteri";

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    const storedHash = user.passwordHash;

    if (!storedHash) {
        const err = new Error("Questo account non ha una password impostata");
        err.status = 400;
        throw err;
    }

    const ok = await bcrypt.compare(String(currentPassword), String(storedHash));
    if (!ok) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = { currentPassword: "Password attuale errata" };
        throw err;
    }

    const saltRounds = getSaltRounds();
    const newHash = await bcrypt.hash(String(newPassword), saltRounds);

    const now = new Date();

    user.passwordHash = newHash;
    user.passwordChangedAt = now;

    // invalida eventuali reset token pendenti
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    user.resetPasswordUsedAt = null;

    await user.save();

    return { ok: true };
}

async function updateMeUser(userId, payload) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    const {
        firstName,
        lastName,
        phone,
        companyName,
        vatNumber,
        taxCode,
        sdiCode,
        pec,
        billingAddressId,
        billingAddress: billingAddressInput,
    } = payload || {};

    const errors = {};

    const hasBillingAddressInput =
        !!billingAddressInput &&
        typeof billingAddressInput === "object" &&
        !Array.isArray(billingAddressInput);

    if (firstName !== undefined) {
        const v = String(firstName).trim();
        if (!v) errors.firstName = "Nome richiesto";
        else user.firstName = v;
    }

    if (lastName !== undefined) {
        const v = String(lastName).trim();
        if (!v) errors.lastName = "Cognome richiesto";
        else user.lastName = v;
    }

    if (phone !== undefined) {
        const v = String(phone || "").trim();
        user.phone = v || undefined;
    }

    if (user.customerType === "piva") {
        if (companyName !== undefined) {
            const v = String(companyName).trim();
            if (!v) errors.companyName = "Ragione sociale richiesta";
            else user.companyName = v;
        }

        if (vatNumber !== undefined) {
            const v = String(vatNumber).trim();
            if (!v) errors.vatNumber = "Partita IVA richiesta";
            else user.vatNumber = v;
        }

        if (taxCode !== undefined) {
            const v = normalizeTaxCode(taxCode);
            if (!v) errors.taxCode = "Codice fiscale richiesto";
            else user.taxCode = v;
        }

        if (sdiCode !== undefined) {
            const v = normalizeSdiCode(sdiCode);
            user.sdiCode = v || null;
        }

        if (pec !== undefined) {
            const v = normalizePec(pec);
            user.pec = v || null;
        }

        if (hasBillingAddressInput) {
            const addressValue = String(billingAddressInput?.address || "").trim();
            const streetNumberValue = String(billingAddressInput?.streetNumber || "").trim();
            const cityValue = String(billingAddressInput?.city || "").trim();
            const capValue = String(billingAddressInput?.cap || "").trim();

            if (!addressValue) errors.billingAddress = "Indirizzo sede legale richiesto";
            if (!streetNumberValue) errors.billingStreetNumber = "N° civico sede legale richiesto";
            if (!cityValue) errors.billingCity = "Città sede legale richiesta";
            if (!/^\d{5}$/.test(capValue)) errors.billingCap = "CAP sede legale non valido (5 cifre)";
        }

        if (!user.companyName) errors.companyName = errors.companyName || "Ragione sociale richiesta";
        if (!user.vatNumber) errors.vatNumber = errors.vatNumber || "Partita IVA richiesta";
        if (!user.taxCode) errors.taxCode = errors.taxCode || "Codice fiscale richiesto";

        if (!user.sdiCode && !user.pec) {
            errors.sdiCode = errors.sdiCode || "Inserisci almeno uno tra Codice SDI e PEC";
            errors.pec = errors.pec || "Inserisci almeno uno tra Codice SDI e PEC";
        }
    }

    if (billingAddressId !== undefined && user.customerType !== "piva") {
        const raw = billingAddressId ? String(billingAddressId).trim() : "";
        if (!raw) {
            user.billingAddressRef = null;
        } else {
            const addr = await Address.findOne({ _id: raw, user: userId }).lean();
            if (!addr) errors.billingAddressId = "Indirizzo fatturazione non trovato";
            else user.billingAddressRef = addr._id;
        }
    }

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    if (user.customerType === "piva" && hasBillingAddressInput) {
        let currentBillingAddress = null;

        if (user.billingAddressRef && mongoose.Types.ObjectId.isValid(String(user.billingAddressRef))) {
            currentBillingAddress = await Address.findOne({
                _id: user.billingAddressRef,
                user: userId,
            });
        }

        const normalizedBilling = normalizeShippingAddress({
            name: user.firstName,
            surname: user.lastName,
            email: user.email,
            phone: user.phone,
            taxCode: user.taxCode,
            address: billingAddressInput?.address,
            streetNumber: billingAddressInput?.streetNumber,
            city: billingAddressInput?.city,
            cap: billingAddressInput?.cap,
        });

        normalizedBilling.phone = normalizedBilling.phone || user.phone || "";
        normalizedBilling.streetNumber =
            normalizedBilling.streetNumber || String(billingAddressInput?.streetNumber || "").trim();

        if (user.taxCode) {
            normalizedBilling.taxCode = user.taxCode;
        }

        if (currentBillingAddress) {
            currentBillingAddress.label = "Sede legale";
            currentBillingAddress.name = normalizedBilling.name || "";
            currentBillingAddress.surname = normalizedBilling.surname || "";
            currentBillingAddress.phone = normalizedBilling.phone || "";
            currentBillingAddress.email = normalizedBilling.email || "";
            currentBillingAddress.taxCode = normalizedBilling.taxCode || "";
            currentBillingAddress.address = normalizedBilling.address || "";
            currentBillingAddress.streetNumber = normalizedBilling.streetNumber || "";
            currentBillingAddress.city = normalizedBilling.city || "";
            currentBillingAddress.cap = normalizedBilling.cap || "";

            await currentBillingAddress.save();
            user.billingAddressRef = currentBillingAddress._id;
        } else {
            const createdBillingAddress = await Address.create({
                user: userId,
                label: "Sede legale",
                isDefault: false,
                name: normalizedBilling.name || "",
                surname: normalizedBilling.surname || "",
                phone: normalizedBilling.phone || "",
                email: normalizedBilling.email || "",
                taxCode: normalizedBilling.taxCode || "",
                address: normalizedBilling.address || "",
                streetNumber: normalizedBilling.streetNumber || "",
                city: normalizedBilling.city || "",
                cap: normalizedBilling.cap || "",
            });

            user.billingAddressRef = createdBillingAddress._id;
        }
    }

    await user.save();
    return { user: user.toSafeObject() };
}

async function requestPasswordReset(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        const err = new Error("Email richiesta");
        err.status = 400;
        throw err;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        return { ok: true };
    }

    const token = makeResetToken();
    const tokenHash = hashResetToken(token);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuti

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    user.resetPasswordUsedAt = null;

    await user.save();

    return {
        ok: true,
        to: user.email,
        name: user.firstName || "",
        token,
    };
}

async function resetPasswordWithToken(token, newPassword) {
    const errors = {};

    const t = String(token || "").trim();
    if (!t) errors.token = "Token richiesto";

    if (!newPassword) errors.newPassword = "Nuova password richiesta";
    else if (String(newPassword).length < 8) errors.newPassword = "Minimo 8 caratteri";

    if (Object.keys(errors).length) {
        const err = new Error("Validation error");
        err.status = 400;
        err.errors = errors;
        throw err;
    }

    const now = new Date();
    const tokenHash = hashResetToken(t);

    const saltRounds = getSaltRounds();
    const newHash = await bcrypt.hash(String(newPassword), saltRounds);

    const user = await User.findOneAndUpdate(
        {
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: { $gt: now },
            resetPasswordUsedAt: null,
        },
        {
            $set: {
                passwordHash: newHash,
                passwordChangedAt: now,
                resetPasswordUsedAt: now,
                resetPasswordTokenHash: null,
                resetPasswordExpiresAt: null,
            },

        },
        { new: false }
    );

    if (!user) {
        const err = new Error("Token non valido o scaduto");
        err.status = 400;
        throw err;
    }

    return { ok: true };
}

async function adminListUsers({ page = 1, limit = 20, q, customerType } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = {};

    const normalizedCustomerType = String(customerType || "").trim().toLowerCase();
    if (normalizedCustomerType && ["private", "piva"].includes(normalizedCustomerType)) {
        filter.customerType = normalizedCustomerType;
    }

    const query = String(q || "").trim();
    if (query) {
        const rx = new RegExp(escapeRegExp(query), "i");
        filter.$or = [
            { email: rx },
            { firstName: rx },
            { lastName: rx },
            { companyName: rx },
            { vatNumber: rx },
            { taxCode: rx },
            { sdiCode: rx },
            { pec: rx },
        ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select(
            "email role customerType firstName lastName phone companyName vatNumber taxCode sdiCode pec billingAddressRef createdAt updatedAt"
        )
        .lean();

    const userIds = users.map((u) => u?._id).filter(Boolean);

    let ordersByUser = new Map();

    const billingAddressIds = users
        .map((u) => u?.billingAddressRef)
        .filter(Boolean)
        .map((id) => String(id));

    let billingAddressesById = new Map();

    if (billingAddressIds.length) {
        const billingAddresses = await Address.find({
            _id: { $in: billingAddressIds },
        })
            .select("label name surname phone email taxCode address streetNumber city cap")
            .lean();

        billingAddressesById = billingAddresses.reduce((map, addr) => {
            const key = String(addr?._id || "");
            if (key) map.set(key, addr);
            return map;
        }, new Map());
    }

    if (userIds.length) {
        const orders = await Order.find({ user: { $in: userIds } })
            .sort({ createdAt: -1 })
            .select("user publicId")
            .lean();

        ordersByUser = orders.reduce((map, order) => {
            const key = String(order?.user || "");
            if (!key) return map;

            const current = map.get(key) || [];
            if (order?.publicId) current.push(String(order.publicId));
            map.set(key, current);
            return map;
        }, new Map());
    }

    const resultUsers = users.map((user) => ({
        ...user,
        billingAddress: user?.billingAddressRef
            ? billingAddressesById.get(String(user.billingAddressRef)) || null
            : null,
        orders: ordersByUser.get(String(user._id)) || [],
    }));

    return {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
        users: resultUsers,
    };
}

module.exports = {
    registerUser,
    loginUser,
    getMe,
    changePasswordUser,
    updateMeUser,
    requestPasswordReset,
    resetPasswordWithToken,
    adminListUsers,
};
