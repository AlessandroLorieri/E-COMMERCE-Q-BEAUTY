import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function onChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

        try {
            const payload = {
                customerType,
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
                email: form.email,
                password: form.password,
            };

            if (customerType === "piva") {
                payload.companyName = form.companyName;
                payload.vatNumber = form.vatNumber;
            }

            await register(payload);
            navigate(next, { replace: true });
        } catch (err) {
            setError(err.message || "Registrazione fallita");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container py-4 shop-auth" style={{ maxWidth: 720 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 shop-auth-header">
                <h1 className="mb-0">Registrazione</h1>
                <Link to="/shop" className="btn btn-outline-light">
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
                        <label className="form-label">Nome</label>
                        <input className="form-control" name="firstName" value={form.firstName} onChange={onChange} required />
                    </div>
                    <div className="col-12 col-md-6">
                        <label className="form-label">Cognome</label>
                        <input className="form-control" name="lastName" value={form.lastName} onChange={onChange} required />
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
                        <div className="form-text">Minimo 8 caratteri.</div>
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
                                <label className="form-label">Ragione sociale</label>
                                <input
                                    className="form-control"
                                    name="companyName"
                                    value={form.companyName}
                                    onChange={onChange}
                                    required
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label">Partita IVA</label>
                                <input className="form-control" name="vatNumber" value={form.vatNumber} onChange={onChange} required />
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
    );
}
