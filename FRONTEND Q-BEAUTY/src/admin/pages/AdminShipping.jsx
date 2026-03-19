import { useEffect, useState } from "react";
import { useAuth } from "../../shop/context/AuthContext";
import "./AdminShipping.css";

function centsToEuroInput(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "";
    return (n / 100).toFixed(2);
}

function euroInputToCents(value) {
    const normalized = String(value || "").trim().replace(",", ".");
    if (!normalized) return NaN;

    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) return NaN;

    return Math.round(n * 100);
}

export default function AdminShipping() {
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [okMsg, setOkMsg] = useState("");

    const [shippingEuro, setShippingEuro] = useState("");
    const [freeThresholdEuro, setFreeThresholdEuro] = useState("");

    async function loadSettings() {
        setLoading(true);
        setError("");
        setOkMsg("");

        try {
            const res = await authFetch("/api/shipping/admin", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.message || "Errore caricamento impostazioni spedizione");
            }

            const settings = data?.settings || {};

            setShippingEuro(centsToEuroInput(settings.shippingCents));
            setFreeThresholdEuro(centsToEuroInput(settings.freeShippingThresholdCents));
        } catch (err) {
            setError(err?.message || "Errore caricamento impostazioni spedizione");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSettings();
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setError("");
        setOkMsg("");

        const shippingCents = euroInputToCents(shippingEuro);
        const freeShippingThresholdCents = euroInputToCents(freeThresholdEuro);

        if (Number.isNaN(shippingCents)) {
            setError("Costo spedizione non valido");
            return;
        }

        if (Number.isNaN(freeShippingThresholdCents)) {
            setError("Soglia spedizione gratuita non valida");
            return;
        }

        setSaving(true);

        try {
            const res = await authFetch("/api/shipping/admin", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shippingCents,
                    freeShippingThresholdCents,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    data?.errors?.shippingCents ||
                    data?.errors?.freeShippingThresholdCents ||
                    data?.message ||
                    "Errore salvataggio impostazioni spedizione";

                throw new Error(msg);
            }

            const settings = data?.settings || {};

            setShippingEuro(centsToEuroInput(settings.shippingCents));
            setFreeThresholdEuro(centsToEuroInput(settings.freeShippingThresholdCents));
            setOkMsg("Impostazioni spedizione salvate ✅");
        } catch (err) {
            setError(err?.message || "Errore salvataggio impostazioni spedizione");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="admin-shipping">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Spedizione</h3>
            </div>

            <div className="card p-3">
                <h5 className="mb-3">Impostazioni spedizione</h5>

                {loading ? (
                    <div className="text-muted">Caricamento...</div>
                ) : (
                    <form onSubmit={handleSave}>
                        {error ? (
                            <div className="alert alert-danger py-2" role="alert">
                                {error}
                            </div>
                        ) : null}

                        {okMsg ? (
                            <div className="alert alert-success py-2" role="alert">
                                {okMsg}
                            </div>
                        ) : null}

                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <label className="form-label">Costo spedizione standard (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                    value={shippingEuro}
                                    onChange={(e) => setShippingEuro(e.target.value)}
                                    placeholder="Es. 7.00"
                                    disabled={saving}
                                />
                                <div className="form-text">
                                    Costo applicato agli ordini sotto soglia.
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label">Soglia spedizione gratuita (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                    value={freeThresholdEuro}
                                    onChange={(e) => setFreeThresholdEuro(e.target.value)}
                                    placeholder="Es. 120.00"
                                    disabled={saving}
                                />
                                <div className="form-text">
                                    Da questa cifra in su la spedizione diventa gratuita.
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                {saving ? "Salvo..." : "Salva"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={loadSettings}
                                disabled={saving}
                            >
                                Ricarica
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}