import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Seo from "../../components/Seo";

import "./ShopAuth.css"

export default function RegisterShop() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/shop";

    const { register } = useAuth();

    const [customerType, setCustomerType] = useState("private");
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        companyName: "",
        vatNumber: "",
        taxCode: "",
        sdiCode: "",
        pec: "",
        address: "",
        streetNumber: "",
        city: "",
        province: "",
        cap: "",
        taxCodeSameAsVat: false,
        confirmBusinessData: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function onChange(e) {
        const { name, value, type, checked } = e.target;

        setFieldErrors((prev) => {
            const next = { ...prev };

            if (name in next) delete next[name];

            if (name === "sdiCode" || name === "pec") {
                delete next.sdiPec;
                delete next.sdiCode;
                delete next.pec;
            }

            if (name === "password" || name === "confirmPassword") {
                delete next.password;
                delete next.confirmPassword;
            }

            if (name === "vatNumber" && form.taxCodeSameAsVat) {
                delete next.vatNumber;
                delete next.taxCode;
            }

            if (name === "taxCodeSameAsVat") {
                delete next.taxCode;
            }

            if (name === "confirmBusinessData") {
                delete next.confirmBusinessData;
            }

            return next;
        });

        setForm((prev) => {
            if (type === "checkbox") {
                if (name === "taxCodeSameAsVat") {
                    return {
                        ...prev,
                        taxCodeSameAsVat: checked,
                        taxCode: checked ? prev.vatNumber : prev.taxCode,
                    };
                }

                return {
                    ...prev,
                    [name]: checked,
                };
            }

            if (name === "vatNumber") {
                return {
                    ...prev,
                    vatNumber: value,
                    taxCode: prev.taxCodeSameAsVat ? value : prev.taxCode,
                };
            }

            if (name === "province") {
                return {
                    ...prev,
                    province: normalizeProvince(value),
                };
            }

            return {
                ...prev,
                [name]: value,
            };
        });
    }

    function normalizeDisplayName(value) {
        return String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    function normalizeCity(value) {
        return String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    function normalizeProvince(value) {
        return String(value || "")
            .trim()
            .replace(/[^a-zA-Z]/g, "")
            .slice(0, 2)
            .toUpperCase();
    }

    function normalizeSdiCode(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase();
    }

    function normalizePec(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }

    const ORDINARY_EMAIL_DOMAINS = new Set([
        "gmail.com",
        "googlemail.com",
        "libero.it",
        "virgilio.it",
        "outlook.com",
        "outlook.it",
        "hotmail.com",
        "hotmail.it",
        "live.com",
        "live.it",
        "yahoo.com",
        "yahoo.it",
        "icloud.com",
        "me.com",
        "tiscali.it",
        "alice.it",
        "tim.it",
        "fastwebnet.it",
        "email.it",
        "proton.me",
        "protonmail.com",
    ]);

    function isValidSdiCode(value) {
        const s = normalizeSdiCode(value);
        if (!s) return false;
        return /^[A-Z0-9]{7}$/.test(s);
    }

    function isValidPec(value) {
        const pec = normalizePec(value);

        if (!pec) return false;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec)) {
            return false;
        }

        const domain = pec.split("@").pop();

        return Boolean(domain) && !ORDINARY_EMAIL_DOMAINS.has(domain);
    }

    function formatRegisterError(err) {
        const raw = String(err?.message || "").trim();
        const low = raw.toLowerCase();

        const payloadErrors = err?.payload?.errors;
        if (payloadErrors && typeof payloadErrors === "object") {
            const firstFieldError = [
                payloadErrors.email,
                payloadErrors.firstName,
                payloadErrors.lastName,
                payloadErrors.companyName,
                payloadErrors.vatNumber,
                payloadErrors.taxCode,
                payloadErrors.sdiCode,
                payloadErrors.pec,
                payloadErrors.confirmBusinessData,
                payloadErrors.customerType,
                payloadErrors.billing,
            ].find((v) => typeof v === "string" && v.trim());

            if (firstFieldError) {
                return firstFieldError;
            }
        }

        if (
            low.includes("email already") ||
            low.includes("already in use") ||
            low.includes("already exists") ||
            low.includes("duplicate") ||
            low.includes("e11000")
        ) {
            return "Questa email è già registrata.";
        }

        if (low.includes("invalid email")) {
            return "Email non valida.";
        }

        if (low.includes("password")) {
            return "Password non valida.";
        }

        if (low.includes("failed to fetch") || low.includes("network")) {
            return "Problema di connessione. Riprova tra poco.";
        }

        if (low === "validation error") {
            return "Controlla i dati inseriti e riprova.";
        }

        return raw || "Registrazione non riuscita. Riprova.";
    }

    function validateForm() {
        const nextErrors = {};

        if (!String(form.firstName || "").trim()) {
            nextErrors.firstName = "Inserisci il nome.";
        }

        if (!String(form.lastName || "").trim()) {
            nextErrors.lastName = "Inserisci il cognome.";
        }

        if (!String(form.email || "").trim()) {
            nextErrors.email = "Inserisci l'email.";
        }

        if (!String(form.password || "").trim()) {
            nextErrors.password = "Inserisci la password.";
        } else if (String(form.password).length < 8) {
            nextErrors.password = "La password deve contenere almeno 8 caratteri.";
        }

        if (!String(form.confirmPassword || "").trim()) {
            nextErrors.confirmPassword = "Conferma la password.";
        } else if (form.password !== form.confirmPassword) {
            nextErrors.confirmPassword = "Le password non coincidono.";
        }

        if (customerType === "piva") {
            if (!String(form.companyName || "").trim()) {
                nextErrors.companyName = "Inserisci la ragione sociale.";
            }

            if (!String(form.vatNumber || "").trim()) {
                nextErrors.vatNumber = "Inserisci la Partita IVA.";
            }

            if (!form.taxCodeSameAsVat && !String(form.taxCode || "").trim()) {
                nextErrors.taxCode = "Inserisci il codice fiscale.";
            }

            if (!String(form.address || "").trim()) {
                nextErrors.address = "Inserisci l'indirizzo della sede legale.";
            }

            if (!String(form.streetNumber || "").trim()) {
                nextErrors.streetNumber = "Inserisci il numero civico della sede legale.";
            }

            if (!String(form.city || "").trim()) {
                nextErrors.city =
                    "Inserisci la città della sede legale.";
            }

            const province = normalizeProvince(form.province);

            if (!province) {
                nextErrors.province =
                    "Inserisci la provincia della sede legale.";
            } else if (!/^[A-Z]{2}$/.test(province)) {
                nextErrors.province =
                    "Inserisci una sigla di provincia valida di 2 lettere.";
            }

            if (!/^\d{5}$/.test(String(form.cap || "").trim())) {
                nextErrors.cap =
                    "Inserisci un CAP valido (5 cifre).";
            }

            const sdiCode = normalizeSdiCode(form.sdiCode);
            const pec = normalizePec(form.pec);

            const hasSdi = Boolean(sdiCode);
            const hasPec = Boolean(pec);
            const pecValid = hasPec && isValidPec(pec);

            if (!hasSdi && !hasPec) {
                nextErrors.sdiCode =
                    "Inserisci il Codice SDI oppure un indirizzo PEC.";

                nextErrors.pec =
                    "Inserisci un indirizzo PEC oppure il Codice SDI.";
            }

            if (hasSdi && !isValidSdiCode(sdiCode)) {
                nextErrors.sdiCode =
                    "Il Codice SDI deve contenere esattamente 7 caratteri alfanumerici.";
            }

            if (hasPec && !pecValid) {
                nextErrors.pec =
                    "Inserisci un indirizzo PEC valido. Gmail, Libero, Outlook e altre email normali non sono accettate.";
            }

            if (!form.confirmBusinessData) {
                nextErrors.confirmBusinessData = "Devi confermare la veridicità dei dati inseriti.";
            }
        }

        return nextErrors;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setFieldErrors({});
        setSubmitting(true);

        const nextErrors = validateForm();

        if (Object.keys(nextErrors).length) {
            setError("");
            setFieldErrors(nextErrors);
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                customerType,
                firstName: normalizeDisplayName(form.firstName),
                lastName: normalizeDisplayName(form.lastName),
                phone: form.phone,
                email: form.email,
                password: form.password,
            };

            if (customerType === "piva") {
                payload.companyName = form.companyName;
                payload.vatNumber = form.vatNumber;
                payload.taxCode = form.taxCodeSameAsVat ? form.vatNumber : form.taxCode;
                payload.sdiCode = String(form.sdiCode || "").trim().toUpperCase();
                payload.pec = String(form.pec || "").trim().toLowerCase();
                payload.address = String(form.address || "").trim();
                payload.streetNumber =
                    String(form.streetNumber || "").trim();

                payload.city =
                    normalizeCity(form.city);

                payload.province =
                    normalizeProvince(form.province);

                payload.cap =
                    String(form.cap || "").trim();
                payload.confirmBusinessData = form.confirmBusinessData;
            }

            await register(payload);
            navigate(next, { replace: true });
        } catch (err) {
            const payloadErrors = err?.payload?.errors;

            if (
                payloadErrors &&
                typeof payloadErrors === "object"
            ) {
                setFieldErrors(payloadErrors);
                setError("");
            } else {
                setError(formatRegisterError(err));
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <Seo
                title="Registrazione | Q•BEAUTY"
                description="Crea il tuo account nello shop Q•BEAUTY."
                canonical="/shop/register"
                noindex
            />

            <div className="container py-4 shop-auth" style={{ maxWidth: 720 }}>
                <div className="d-flex align-items-center mb-3 shop-auth-header gap-2">
                    <h1 className="mb-0 flex-grow-1" style={{ minWidth: 0 }}>
                        Registrazione
                    </h1>

                    <Link
                        to="/shop"
                        className="btn btn-outline-light btn-sm text-nowrap flex-grow-0 flex-shrink-0 w-auto px-2 py-1"
                    >
                        Torna allo shop
                    </Link>
                </div>

                <form
                    className="card p-3 shop-card"
                    onSubmit={handleSubmit}
                    noValidate
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                >
                    {error && (
                        <div className="alert alert-danger py-2" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Tipo account</label>

                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="customerType"
                                id="private"
                                checked={customerType === "private"}
                                onChange={() => setCustomerType("private")}
                            />
                            <label className="form-check-label" htmlFor="private">
                                Privato
                            </label>
                        </div>

                        <div className="form-check mt-1">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="customerType"
                                id="piva"
                                checked={customerType === "piva"}
                                onChange={() => setCustomerType("piva")}
                            />
                            <label className="form-check-label" htmlFor="piva">
                                Partita IVA
                            </label>
                        </div>
                    </div>

                    <div className="row g-2">
                        <div className="col-12 col-md-6">
                            <label className="form-label">
                                {customerType === "piva" ? "Nome referente" : "Nome"}
                            </label>
                            <input
                                className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
                                name="firstName"
                                value={form.firstName}
                                onChange={onChange}
                                onBlur={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        firstName: normalizeDisplayName(e.target.value),
                                    }))
                                }
                                required
                            />
                            {fieldErrors.firstName ? (
                                <div className="invalid-feedback d-block">{fieldErrors.firstName}</div>
                            ) : null}
                        </div>
                        <div className="col-12 col-md-6">
                            <label className="form-label">
                                {customerType === "piva" ? "Cognome referente" : "Cognome"}
                            </label>
                            <input
                                className={`form-control ${fieldErrors.lastName ? "is-invalid" : ""}`}
                                name="lastName"
                                value={form.lastName}
                                onChange={onChange}
                                onBlur={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        lastName: normalizeDisplayName(e.target.value),
                                    }))
                                }
                                required
                            />
                            {fieldErrors.lastName ? (
                                <div className="invalid-feedback d-block">{fieldErrors.lastName}</div>
                            ) : null}
                        </div>

                        <div className="col-12">
                            <label className="form-label">Telefono (opzionale)</label>
                            <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
                        </div>

                        <div className="col-12">
                            <label className="form-label">Email</label>
                            <input
                                className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={onChange}
                                required
                            />
                            {fieldErrors.email ? (
                                <div className="invalid-feedback d-block">{fieldErrors.email}</div>
                            ) : null}
                        </div>

                        <div className="col-12">
                            <label className="form-label">Password</label>
                            <div className="input-group">
                                <input
                                    className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={onChange}
                                    required
                                    minLength={8}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                                >
                                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />

                                </button>
                            </div>
                            {fieldErrors.password ? (
                                <div className="invalid-feedback d-block">{fieldErrors.password}</div>
                            ) : null}
                            <div className="form-text" style={{ color: "rgba(255,255,255,0.68)" }}>
                                Minimo 8 caratteri.
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="form-label">Conferma password</label>
                            <div className="input-group">
                                <input
                                    className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={onChange}
                                    required
                                    minLength={8}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                    aria-label={showConfirmPassword ? "Nascondi conferma" : "Mostra conferma"}
                                >
                                    <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
                                </button>
                            </div>

                            {fieldErrors.confirmPassword ? (
                                <div className="invalid-feedback d-block">{fieldErrors.confirmPassword}</div>
                            ) : form.confirmPassword && form.password !== form.confirmPassword ? (
                                <div className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>
                                    Le password non coincidono
                                </div>
                            ) : null}
                        </div>

                        {customerType === "piva" && (
                            <>
                                <div className="col-12">
                                    <label className="form-label">Ragione sociale / Denominazione</label>
                                    <input
                                        className={`form-control ${fieldErrors.companyName ? "is-invalid" : ""}`}
                                        name="companyName"
                                        value={form.companyName}
                                        onChange={onChange}
                                        required
                                    />
                                    {fieldErrors.companyName ? (
                                        <div className="invalid-feedback d-block">{fieldErrors.companyName}</div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">Partita IVA</label>
                                    <input
                                        className={`form-control ${fieldErrors.vatNumber ? "is-invalid" : ""}`}
                                        name="vatNumber"
                                        value={form.vatNumber}
                                        onChange={onChange}
                                        required
                                    />
                                    {fieldErrors.vatNumber ? (
                                        <div className="invalid-feedback d-block">{fieldErrors.vatNumber}</div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                        <span>Codice fiscale</span>

                                        <span className="form-check m-0">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="taxCodeSameAsVat"
                                                name="taxCodeSameAsVat"
                                                checked={!!form.taxCodeSameAsVat}
                                                onChange={onChange}
                                            />
                                            <label className="form-check-label ms-1" htmlFor="taxCodeSameAsVat">
                                                Uguale a P.IVA
                                            </label>
                                        </span>
                                    </label>

                                    <input
                                        className={`form-control ${fieldErrors.taxCode ? "is-invalid" : ""}`}
                                        name="taxCode"
                                        value={form.taxCode}
                                        onChange={onChange}
                                        required={!form.taxCodeSameAsVat}
                                        disabled={!!form.taxCodeSameAsVat}
                                    />
                                    {fieldErrors.taxCode ? (
                                        <div className="invalid-feedback d-block">{fieldErrors.taxCode}</div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">
                                        Codice destinatario SDI
                                    </label>

                                    <input
                                        className={`form-control ${fieldErrors.sdiCode ? "is-invalid" : ""
                                            }`}
                                        name="sdiCode"
                                        value={form.sdiCode}
                                        onChange={onChange}
                                        placeholder="Es. ABCD123"
                                        maxLength={7}
                                        aria-invalid={
                                            fieldErrors.sdiCode ? "true" : "false"
                                        }
                                        spellCheck={false}
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                    />

                                    {fieldErrors.sdiCode ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.sdiCode}
                                        </div>
                                    ) : (
                                        <div
                                            className="form-text"
                                            style={{
                                                color: "rgba(255,255,255,0.68)",
                                            }}
                                        >
                                            Il Codice SDI deve contenere 7 caratteri
                                            alfanumerici.
                                        </div>
                                    )}
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">PEC</label>

                                    <input
                                        className={`form-control ${fieldErrors.pec ? "is-invalid" : ""
                                            }`}
                                        type="email"
                                        name="pec"
                                        value={form.pec}
                                        onChange={onChange}
                                        placeholder="esempio@pec.it"
                                        aria-invalid={
                                            fieldErrors.pec ? "true" : "false"
                                        }
                                        spellCheck={false}
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                    />

                                    {fieldErrors.pec ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.pec}
                                        </div>
                                    ) : (
                                        <div
                                            className="form-text"
                                            style={{
                                                color: "rgba(255,255,255,0.68)",
                                            }}
                                        >
                                            Inserisci esclusivamente un indirizzo PEC,
                                            non una normale email.
                                        </div>
                                    )}
                                </div>

                                <div className="col-12">
                                    <div
                                        className="form-text"
                                        style={{ color: "rgba(255,255,255,0.68)" }}
                                    >
                                        Inserisci almeno uno tra Codice SDI e PEC. Puoi utilizzare 0000000 se non disponi di un codice destinatario.
                                    </div>
                                </div>

                                <div className="col-12 mt-2">
                                    <div className="fw-semibold mb-2">Sede legale / indirizzo di fatturazione</div>
                                    <div className="form-text mb-2" style={{ color: "rgba(255,255,255,0.68)" }}>
                                        Questo indirizzo verrà salvato come sede legale per la fatturazione della Partita IVA.
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Indirizzo sede legale</label>
                                    <input
                                        className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`}
                                        name="address"
                                        value={form.address}
                                        onChange={onChange}
                                        required
                                    />
                                    {fieldErrors.address ? (
                                        <div className="invalid-feedback d-block">{fieldErrors.address}</div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-2">
                                    <label className="form-label">N° civico</label>

                                    <input
                                        className={`form-control ${fieldErrors.streetNumber ? "is-invalid" : ""
                                            }`}
                                        name="streetNumber"
                                        value={form.streetNumber}
                                        onChange={onChange}
                                        required
                                    />

                                    {fieldErrors.streetNumber ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.streetNumber}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-5">
                                    <label className="form-label">Città</label>

                                    <input
                                        className={`form-control ${fieldErrors.city ? "is-invalid" : ""
                                            }`}
                                        name="city"
                                        value={form.city}
                                        onChange={onChange}
                                        onBlur={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                city: normalizeCity(e.target.value),
                                            }))
                                        }
                                        required
                                    />

                                    {fieldErrors.city ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.city}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-2">
                                    <label className="form-label">Provincia</label>

                                    <input
                                        className={`form-control ${fieldErrors.province ? "is-invalid" : ""
                                            }`}
                                        name="province"
                                        value={form.province}
                                        onChange={onChange}
                                        placeholder="Es.   PR"
                                        maxLength={2}
                                        autoCapitalize="characters"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        required
                                    />

                                    {fieldErrors.province ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.province}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="col-12 col-md-3">
                                    <label className="form-label">CAP</label>

                                    <input
                                        className={`form-control ${fieldErrors.cap ? "is-invalid" : ""
                                            }`}
                                        name="cap"
                                        value={form.cap}
                                        onChange={onChange}
                                        inputMode="numeric"
                                        maxLength={5}
                                        required
                                    />

                                    {fieldErrors.cap ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.cap}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="col-12">
                                    <div className="form-check mt-2">
                                        <input
                                            className={`form-check-input ${fieldErrors.confirmBusinessData ? "is-invalid" : ""}`}
                                            type="checkbox"
                                            id="confirmBusinessData"
                                            name="confirmBusinessData"
                                            checked={!!form.confirmBusinessData}
                                            onChange={onChange}
                                            required={customerType === "piva"}
                                        />
                                        <label className="form-check-label" htmlFor="confirmBusinessData">
                                            Ho controllato e confermo la veridicità dei dati inseriti
                                        </label>

                                        {fieldErrors.confirmBusinessData ? (
                                            <div className="invalid-feedback d-block">
                                                {fieldErrors.confirmBusinessData}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button className="btn shop-btn-primary mt-3" type="submit" disabled={submitting}>
                        {submitting ? "Registrazione..." : "Crea account"}
                    </button>

                    <p className="text-muted mt-2 mb-0" style={{ fontSize: 15 }}>
                        Hai già un account?{" "}
                        <Link to={`/shop/login?next=${encodeURIComponent(next)}`}>Vai al login</Link>
                    </p>
                </form>
            </div>
        </>
    );
}
