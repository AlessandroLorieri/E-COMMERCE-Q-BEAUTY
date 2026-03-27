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

    function isValidSdiCode(value) {
        const s = normalizeSdiCode(value);
        if (!s) return false;
        return /^[A-Z0-9]{7}$/.test(s);
    }

    function isValidPec(value) {
        const s = normalizePec(value);
        if (!s) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

            const sdiCode = normalizeSdiCode(form.sdiCode);
            const pec = normalizePec(form.pec);

            const hasSdi = !!sdiCode;
            const hasPec = !!pec;
            const pecValid = hasPec ? isValidPec(pec) : false;

            if (!hasSdi && !hasPec) {
                nextErrors.sdiPec = "Inserisci almeno uno tra Codice SDI e PEC.";
            }

            if (hasSdi && !isValidSdiCode(sdiCode)) {
                nextErrors.sdiCode = "Codice SDI non valido.";
            }

            if (sdiCode === "0000000" && !pecValid) {
                nextErrors.sdiPec = "Se inserisci 0000000 devi indicare anche una PEC valida.";
                if (!hasPec) {
                    nextErrors.pec = "Con Codice SDI 0000000 la PEC è obbligatoria.";
                } else {
                    nextErrors.pec = "PEC non valida.";
                }
            } else if (hasPec && !pecValid) {
                nextErrors.pec = "PEC non valida.";
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
                payload.confirmBusinessData = form.confirmBusinessData;
            }

            await register(payload);
            navigate(next, { replace: true });
        } catch (err) {
            setError(formatRegisterError(err));
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
                                    <label className="form-label">Codice destinatario SDI</label>
                                    <input
                                        className={`form-control ${fieldErrors.sdiCode || fieldErrors.sdiPec ? "is-invalid" : ""}`}
                                        name="sdiCode"
                                        value={form.sdiCode}
                                        onChange={onChange}
                                        placeholder="Es. ABCD123"
                                        maxLength={7}
                                        aria-invalid={fieldErrors.sdiCode || fieldErrors.sdiPec ? "true" : "false"}
                                        spellCheck={false}
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                    />
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">PEC</label>
                                    <input
                                        className={`form-control ${fieldErrors.pec || fieldErrors.sdiPec ? "is-invalid" : ""}`}
                                        type="email"
                                        name="pec"
                                        value={form.pec}
                                        onChange={onChange}
                                        placeholder="esempio@pec.it"
                                        aria-invalid={fieldErrors.pec || fieldErrors.sdiPec ? "true" : "false"}
                                        spellCheck={false}
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                    />
                                </div>

                                <div className="col-12">
                                    {fieldErrors.sdiCode || fieldErrors.pec || fieldErrors.sdiPec ? (
                                        <div className="invalid-feedback d-block">
                                            {fieldErrors.sdiCode || fieldErrors.pec || fieldErrors.sdiPec}
                                        </div>
                                    ) : (
                                        <div className="form-text" style={{ color: "rgba(255,255,255,0.68)" }}>
                                            Inserisci almeno uno tra Codice SDI e PEC per la fatturazione elettronica. Se usi 0000000, la PEC è obbligatoria.
                                        </div>
                                    )}
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
