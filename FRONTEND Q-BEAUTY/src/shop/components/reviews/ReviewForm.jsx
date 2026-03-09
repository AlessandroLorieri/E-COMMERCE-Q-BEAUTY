import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const INITIAL_FORM = {
    name: "",
    rating: 5,
    text: "",
};

export default function ReviewForm({ onCreated }) {
    const { user, authFetch } = useAuth();

    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [sending, setSending] = useState(false);

    function setField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const name = String(form.name || "").trim();
        const text = String(form.text || "").trim();
        const rating = Math.max(1, Math.min(5, Number(form.rating) || 5));

        if (text.length < 20) {
            setError("Scrivi almeno 20 caratteri per la recensione.");
            return;
        }

        setSending(true);

        try {
            const res = await authFetch("/api/reviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    rating,
                    text,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.message || "Errore invio recensione");
            }

            setForm(INITIAL_FORM);
            setSuccess("Recensione inviata. Sarà pubblicata dopo approvazione.");
            onCreated?.();
        } catch (err) {
            if (err?.code === "SESSION_EXPIRED") {
                setError("Sessione scaduta. Fai di nuovo login per inviare la recensione.");
            } else {
                setError(err.message || "Errore invio recensione");
            }
        } finally {
            setSending(false);
        }
    }

    if (!user) {
        return (
            <div className="qb-review-form">
                <div className="qb-review-form__head">
                    <h3 className="qb-review-form__title">Lascia la tua esperienza</h3>
                    <p className="qb-review-form__subtitle">
                        Per lasciare una recensione devi prima accedere al tuo account.
                    </p>
                </div>

                <div className="qb-review-form__actions">
                    <Link to="/shop/login" className="qb-review-form__submit d-inline-flex align-items-center justify-content-center text-decoration-none">
                        Accedi per recensire
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form className="qb-review-form" onSubmit={handleSubmit}>
            <div className="qb-review-form__head">
                <h3 className="qb-review-form__title">Lascia la tua esperienza</h3>
                <p className="qb-review-form__subtitle">
                    La recensione sarà verificata prima della pubblicazione.
                </p>
            </div>

            {error ? <div className="qb-review-form__alert qb-review-form__alert--error">{error}</div> : null}
            {success ? <div className="qb-review-form__alert qb-review-form__alert--success">{success}</div> : null}

            <div className="qb-review-form__grid">
                
                <div className="qb-review-form__full">
                    <label className="qb-review-form__label">Nome</label>
                    <input
                        className="qb-review-form__input"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Il tuo nome"
                        disabled={sending}
                    />
                </div>

                <div className="qb-review-form__full">
                    <label className="qb-review-form__label">Valutazione</label>
                    <div className="qb-review-form__stars">
                        {Array.from({ length: 5 }).map((_, i) => {
                            const value = i + 1;
                            const active = value <= Number(form.rating);

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    className={`qb-review-form__star ${active ? "is-active" : ""}`}
                                    onClick={() => setField("rating", value)}
                                    disabled={sending}
                                >
                                    ★
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="qb-review-form__full">
                    <label className="qb-review-form__label">Recensione</label>
                    <textarea
                        className="qb-review-form__textarea"
                        rows={5}
                        value={form.text}
                        onChange={(e) => setField("text", e.target.value)}
                        placeholder="Racconta la tua esperienza con Q-BEAUTY..."
                        disabled={sending}
                    />
                </div>
            </div>

            <div className="qb-review-form__actions">
                <button type="submit" className="qb-review-form__submit" disabled={sending}>
                    {sending ? "Invio..." : "Invia recensione"}
                </button>
            </div>
        </form>
    );
}