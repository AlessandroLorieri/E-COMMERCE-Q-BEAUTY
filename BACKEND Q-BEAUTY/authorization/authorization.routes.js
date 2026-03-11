const express = require("express");
const controller = require("./authorization.controller");
const { authRequired } = require("../middleware/auth.middleware");

const router = express.Router();

const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 128;
const MAX_NAME_LEN = 60;
const MAX_TOKEN_LEN = 512;
const MAX_TAX_CODE_LEN = 32;

function toStr(v) {
    return v == null ? "" : String(v);
}

function normalizeEmail(v) {
    return toStr(v).trim().toLowerCase();
}

function normalizeTaxCode(v) {
    return toStr(v).trim().replace(/\s+/g, "").toUpperCase();
}

function isValidEmail(email) {
    if (!email) return false;
    if (email.length > MAX_EMAIL_LEN) return false;
    // Regex "buona abbastanza" (non RFC completa, ma evita porcherie)
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function pickTrimmed(v, maxLen) {
    const s = toStr(v).trim();
    if (!s) return "";
    if (maxLen && s.length > maxLen) return s.slice(0, maxLen);
    return s;
}

function badRequest(res, errors, message = "Validation error") {
    return res.status(400).json({ message, errors });
}

function validateForgotPassword(req, res, next) {
    const email = normalizeEmail(req.body?.email);
    if (!email) return badRequest(res, { email: "Email richiesta" });
    if (!isValidEmail(email)) return badRequest(res, { email: "Email non valida" });

    // normalizzo input
    req.body = { ...(req.body || {}), email };
    return next();
}

function validateResetPassword(req, res, next) {
    const token = pickTrimmed(req.body?.token, MAX_TOKEN_LEN);
    const newPassword = toStr(req.body?.newPassword);

    const errors = {};
    if (!token) errors.token = "Token richiesto";
    if (token && token.length > MAX_TOKEN_LEN) errors.token = "Token troppo lungo";

    if (!newPassword) errors.newPassword = "Nuova password richiesta";
    else if (newPassword.length < 8) errors.newPassword = "Minimo 8 caratteri";
    else if (newPassword.length > MAX_PASSWORD_LEN) errors.newPassword = "Password troppo lunga";

    if (Object.keys(errors).length) return badRequest(res, errors);

    req.body = { ...(req.body || {}), token, newPassword };
    return next();
}

function validateLogin(req, res, next) {
    const email = normalizeEmail(req.body?.email);
    const password = toStr(req.body?.password);

    const errors = {};
    if (!email) errors.email = "Email richiesta";
    else if (!isValidEmail(email)) errors.email = "Email non valida";

    if (!password) errors.password = "Password richiesta";
    else if (password.length > MAX_PASSWORD_LEN) errors.password = "Password troppo lunga";

    if (Object.keys(errors).length) return badRequest(res, errors);

    req.body = { ...(req.body || {}), email, password };
    return next();
}

function validateRegister(req, res, next) {
    const email = normalizeEmail(req.body?.email);
    const password = toStr(req.body?.password);

    const customerType = pickTrimmed(req.body?.customerType, 20);
    const firstName = pickTrimmed(req.body?.firstName, MAX_NAME_LEN);
    const lastName = pickTrimmed(req.body?.lastName, MAX_NAME_LEN);

    const phone = pickTrimmed(req.body?.phone, 30);
    const companyName = pickTrimmed(req.body?.companyName, 120);
    const vatNumber = pickTrimmed(req.body?.vatNumber, 20);
    const taxCode = normalizeTaxCode(req.body?.taxCode).slice(0, MAX_TAX_CODE_LEN);

    const confirmBusinessData =
        req.body?.confirmBusinessData === true ||
        req.body?.confirmBusinessData === "true" ||
        req.body?.confirmBusinessData === 1 ||
        req.body?.confirmBusinessData === "1";

    const errors = {};

    if (!email) errors.email = "Email richiesta";
    else if (!isValidEmail(email)) errors.email = "Email non valida";

    if (!password) errors.password = "Password richiesta";
    else if (password.length < 8) errors.password = "Minimo 8 caratteri";
    else if (password.length > MAX_PASSWORD_LEN) errors.password = "Password troppo lunga";

    if (!customerType) errors.customerType = "customerType richiesto";
    else if (!["private", "piva"].includes(customerType)) errors.customerType = "customerType non valido";

    if (!firstName) errors.firstName = "Nome richiesto";
    if (!lastName) errors.lastName = "Cognome richiesto";

    if (customerType === "piva") {
        if (!companyName) errors.companyName = "Ragione sociale richiesta";
        if (!vatNumber) errors.vatNumber = "Partita IVA richiesta";
        if (!taxCode) errors.taxCode = "Codice fiscale richiesto";
        if (!confirmBusinessData) {
            errors.confirmBusinessData = "Devi confermare la veridicità dei dati inseriti";
        }
    }

    if (Object.keys(errors).length) return badRequest(res, errors);

    req.body = {
        ...(req.body || {}),
        email,
        password,
        customerType,
        firstName,
        lastName,
        ...(phone ? { phone } : {}),
        ...(companyName ? { companyName } : {}),
        ...(vatNumber ? { vatNumber } : {}),
        ...(taxCode ? { taxCode } : {}),
        ...(customerType === "piva" ? { confirmBusinessData } : {}),
    };

    return next();
}

// RECUPERO PASSWORD
router.post("/forgot-password", validateForgotPassword, controller.forgotPassword);
router.post("/reset-password", validateResetPassword, controller.resetPassword);

// register
router.post("/register", validateRegister, controller.register);

// login
router.post("/login", validateLogin, controller.login);

router.get("/me", authRequired, controller.me);
// (protetta) - aggiorna profilo + fatturazione
router.patch("/me", authRequired, controller.updateMe);

// /(protetta) - cambio password
router.patch("/password", authRequired, controller.changePassword);

module.exports = router;

