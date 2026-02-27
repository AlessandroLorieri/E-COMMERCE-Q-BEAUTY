import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import "./ShopAuth.css";

export default function ResetPasswordShop() {
    const apiBase = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const token = useMemo(() => String(params.get("token") || "").trim(), [params]);
    const next = params.get("next") || "/shop/cart";

    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Token mancante o non valido.");
            return;
        }

        if (!newPassword || !confirm) {
            setError("Compila tutti i campi.");
            return;
        }
        if (newPassword.length < 8) {
            setError("La password deve avere almeno 8 caratteri.");
            return;
        }
        if (newPassword !== confirm) {
            setError("Le password non coincidono.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Errore reset password");

            navigate(`/shop/login?reset=1&next=${encodeURIComponent(next)}`, { replace: true });
        } catch (err) {
            setError(err.message || "Errore reset password");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container py-4 shop-auth" style={{ maxWidth: 720 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 shop-auth-header">
                <h1 className="mb-0">Nuova password</h1>
                <Link to="/shop" className="btn btn-outline-light">
                    Torna allo shop
                </Link>
            </div>

            <div className="card p-3 shop-card">
                {!token ? (
                    <div className="alert alert-danger py-2" role="alert">
                        Token mancante o non valido. Apri il link ricevuto via email.
                    </div>
                ) : null}

                {error ? (
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <div className="mb-2">
                        <label className="form-label">Nuova password</label>
                        <div className="input-group">
                            <input
                                className="form-control"
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                minLength={8}
                                disabled={submitting || !token}
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary shop-eye-btn"
                                onClick={() => setShowNew((v) => !v)}
                                aria-label="Mostra/Nascondi nuova password"
                                disabled={submitting || !token}
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="form-text">Minimo 8 caratteri.</div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Conferma password</label>
                        <div className="input-group">
                            <input
                                className="form-control"
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                minLength={8}
                                disabled={submitting || !token}
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary shop-eye-btn"
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label="Mostra/Nascondi conferma password"
                                disabled={submitting || !token}
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn shop-btn-primary" disabled={submitting || !token}>
                        {submitting ? "Salvo..." : "Imposta nuova password"}
                    </button>

                    <div className="mt-3">
                        <Link to={`/shop/login?next=${encodeURIComponent(next)}`}>Torna al login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
