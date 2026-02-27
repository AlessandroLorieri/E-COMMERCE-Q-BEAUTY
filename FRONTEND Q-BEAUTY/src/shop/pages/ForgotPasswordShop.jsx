import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import "./ShopAuth.css";

export default function ForgotPasswordShop() {
    const apiBase = import.meta.env.VITE_API_URL;
    const [params] = useSearchParams();
    const next = params.get("next") || "/shop/cart";

    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);
    const [sent, setSent] = useState(false);


    async function handleSubmit(e) {
        e.preventDefault();

        setError("");
        setOk("");

        try {
            const res = await fetch(`${apiBase}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.message || "Errore richiesta");
            }

            setOk("Se l’email è registrata, ti abbiamo inviato le istruzioni per il reset.");
            setSent(true);
        } catch (err) {
            setError(err.message || "Errore richiesta");
        }
    }


    return (
        <div className="container py-4 shop-auth" style={{ maxWidth: 720 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 shop-auth-header">
                <h1 className="mb-0">Recupero password</h1>
                <Link to="/shop" className="btn btn-outline-light">
                    Torna allo shop
                </Link>
            </div>

            <div className="card p-3 shop-card">
                {error ? (
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                ) : null}

                {error ? (
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                ) : null}

                {sent ? (
                    <div className="alert alert-success py-2" role="alert">
                        {ok || "Se l’email è registrata, riceverai un link per reimpostare la password."}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                className="form-control"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                    setOk("");
                                    setSent(false);
                                }}
                                required
                                disabled={submitting}
                            />
                        </div>

                        <button type="submit" className="btn shop-btn-primary" disabled={submitting}>
                            {submitting ? "Invio..." : "Invia link reset"}
                        </button>

                        <div className="mt-3 d-flex justify-content-between">
                            <Link to={`/shop/login?next=${encodeURIComponent(next)}`}>Torna al login</Link>
                            <Link to={`/shop/register?next=${encodeURIComponent(next)}`}>Registrati</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
