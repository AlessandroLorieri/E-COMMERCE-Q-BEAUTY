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
        taxCodeSameAsVat: false,
        confirmBusinessData: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function onChange(e) {
        const { name, value, type, checked } = e.target;

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

    function formatRegisterError(err) {
        const raw = String(err?.message || "").trim();
        const low = raw.toLowerCase();

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

        return "Registrazione non riuscita. Riprova.";
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        if (form.password !== form.confirmPassword) {
            setError("Le password non coincidono");
            setSubmitting(false);
            return;
        }

        if (customerType === "piva" && !form.confirmBusinessData) {
            setError("Devi confermare la veridicità dei dati inseriti.");
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

                <form className="card p-3 shop-card" onSubmit={handleSubmit}>
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
                                className="form-control"
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
                        </div>
                        <div className="col-12 col-md-6">
                            <label className="form-label">
                                {customerType === "piva" ? "Cognome referente" : "Cognome"}
                            </label>
                            <input
                                className="form-control"
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
                        </div>

                        <div className="col-12">
                            <label className="form-label">Telefono (opzionale)</label>
                            <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
                        </div>

                        <div className="col-12">
                            <label className="form-label">Email</label>
                            <input className="form-control" type="email" name="email" value={form.email} onChange={onChange} required />
                        </div>

                        <div className="col-12">
                            <label className="form-label">Password</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
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
                            <div className="form-text" style={{ color: "rgba(255,255,255,0.68)" }}>
                                Minimo 8 caratteri.
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="form-label">Conferma password</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
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

                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <div className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>
                                    Le password non coincidono
                                </div>
                            )}
                        </div>

                        {customerType === "piva" && (
                            <>
                                <div className="col-12">
                                    <label className="form-label">Ragione sociale / Denominazione</label>
                                    <input
                                        className="form-control"
                                        name="companyName"
                                        value={form.companyName}
                                        onChange={onChange}
                                        required
                                    />
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">Partita IVA</label>
                                    <input
                                        className="form-control"
                                        name="vatNumber"
                                        value={form.vatNumber}
                                        onChange={onChange}
                                        required
                                    />
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
                                        className="form-control"
                                        name="taxCode"
                                        value={form.taxCode}
                                        onChange={onChange}
                                        required={!form.taxCodeSameAsVat}
                                        disabled={!!form.taxCodeSameAsVat}
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="form-check mt-2">
                                        <input
                                            className="form-check-input"
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
