import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";
import { formatEURFromCents } from "../../shop/utils/money";

import "./AdminOrders.css"

const STATUS_OPTIONS = [
    { value: "pending_payment", label: "In attesa di pagamento" },
    { value: "paid", label: "Pagato" },
    { value: "processing", label: "In preparazione" },
    { value: "shipped", label: "Spedito" },
    { value: "completed", label: "Consegnato" },
    { value: "cancelled", label: "Annullato" },
    { value: "refunded", label: "Rimborsato" },
];

const STATUS_META = {
    pending_payment: { label: "In attesa di pagamento", badge: "qb-badge qb-badge-muted" },
    paid: { label: "Pagato", badge: "qb-badge qb-badge-info" },
    processing: { label: "In preparazione", badge: "qb-badge qb-badge-warn" },
    shipped: { label: "Spedito", badge: "qb-badge qb-badge-primary" },
    completed: { label: "Consegnato", badge: "qb-badge qb-badge-success" },
    cancelled: { label: "Annullato", badge: "qb-badge qb-badge-danger" },
    refunded: { label: "Rimborsato", badge: "qb-badge qb-badge-dark" },
    draft: { label: "Bozza", badge: "qb-badge qb-badge-light" },
};


function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

function statusMeta(status) {
    const s = (status || "").trim();
    const base =
        STATUS_META[s] || {
            label: s || "-",
            badge: "qb-badge qb-badge-light",
        };

    return base;
}

export default function AdminOrders() {
    const apiBase = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState("");
    const [q, setQ] = useState("");

    const [openId, setOpenId] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [trackingDraft, setTrackingDraft] = useState({});

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", String(limit));
        if (statusFilter) sp.set("status", statusFilter);
        if (q.trim()) sp.set("q", q.trim());
        return sp.toString();
    }, [page, limit, statusFilter, q]);

    async function apiFetch(path, options = {}) {
        const res = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (res.status === 401) {
            logout();
            const next = encodeURIComponent("/admin/orders");
            navigate(`/shop/login?next=${next}`, { replace: true });
            throw new Error("Sessione scaduta, rifai login");
        }
        if (res.status === 403) {
            throw new Error("Forbidden: non sei admin");
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data?.message || "Errore richiesta";
            const e = new Error(msg);
            e.payload = data;
            throw e;
        }
        return data;
    }

    async function loadOrders() {
        setErrMsg("");
        setLoading(true);
        try {
            const data = await apiFetch(`/api/orders/admin?${qs}`, { method: "GET" });
            const list = Array.isArray(data.orders) ? data.orders.filter((o) => o && o._id) : [];
            setOrders(list);
            setPage(data.page || 1);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento ordini");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrders();
    }, [qs]);

    async function setStatus(orderId, status, shipment) {
        setErrMsg("");
        setSavingId(orderId);

        try {
            const shipObj = shipment && typeof shipment === "object" ? shipment : null;

            const carrierName = shipObj?.carrierName != null ? String(shipObj.carrierName).trim() : "";
            const trackingCode = shipObj?.trackingCode != null ? String(shipObj.trackingCode).trim() : "";
            const trackingUrl = shipObj?.trackingUrl != null ? String(shipObj.trackingUrl).trim() : "";

            const hasShipment = !!(carrierName || trackingCode || trackingUrl);

            const payload = {
                status,
                ...(hasShipment ? { shipment: { carrierName, trackingCode, trackingUrl } } : {}),
            };

            await apiFetch(`/api/orders/admin/${encodeURIComponent(orderId)}/status`, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });

            await loadOrders();
        } catch (e) {
            const payloadErrors = e?.payload?.errors;

            if (payloadErrors?.status) {
                setErrMsg(String(payloadErrors.status));
            } else if (payloadErrors?.shipment) {
                setErrMsg(String(payloadErrors.shipment));
            } else {
                setErrMsg(e.message || "Errore aggiornamento status");
            }
        } finally {
            setSavingId(null);
        }
    }

    async function cancelOrder(o) {
        if (!o || !o._id) return;

        const ok = window.confirm(
            `Annullare questo ordine e ripristinare lo stock?\n\n${o.publicId || o._id}\n\nAzione irreversibile.`
        );
        if (!ok) return;

        setErrMsg("");
        setSavingId(o._id);

        try {
            await apiFetch(`/api/orders/admin/${encodeURIComponent(o._id)}/cancel`, {
                method: "PATCH",
            });
            await loadOrders();
            setOpenId(null);
        } catch (e) {
            setErrMsg(e.message || "Errore annullamento ordine");
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div className="admin-orders" >
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Ordini</h3>
                <div className="text-muted">
                    Totale: <b>{total}</b>
                </div>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    className="form-control"
                    style={{ maxWidth: 320 }}
                    placeholder="Cerca publicId o email/nome..."
                    value={q}
                    onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                    }}
                />

                <select
                    className="form-select"
                    style={{ maxWidth: 260 }}
                    value={statusFilter}
                    onChange={(e) => {
                        setPage(1);
                        setStatusFilter(e.target.value);
                    }}
                >
                    <option value="">Tutti gli status</option>
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <div className="ms-auto d-flex gap-2 align-items-center">
                    <button
                        className="btn btn-outline-secondary"
                        disabled={loading || page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>

                    <div className="text-muted">
                        Pagina <b>{page}</b> / {pages}
                    </div>

                    <button
                        className="btn btn-outline-secondary"
                        disabled={loading || page >= pages}
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="list-group">
                {(orders || []).filter((o) => o && o._id).map((o) => {
                    const isOpen = openId === o._id;
                    const u = o.user || {};
                    const meta = statusMeta(o.status);

                    const canShip = o.status === "processing" || o.status === "paid";


                    const draft = trackingDraft[o._id] || {
                        carrierName: o?.shipment?.carrierName || "",
                        trackingCode: o?.shipment?.trackingCode || "",
                        trackingUrl: o?.shipment?.trackingUrl || "",
                    };

                    function setDraftField(field, value) {
                        setTrackingDraft((prev) => ({
                            ...prev,
                            [o._id]: { ...draft, [field]: value },
                        }));
                    }

                    const subtotal = Number(o.subtotalCents ?? 0);
                    const discount = Number(o.discountCents ?? 0);
                    const totalCents = Number(o.totalCents ?? 0);

                    const computedShipping = Math.max(0, totalCents - Math.max(0, subtotal - discount));
                    const shipping = Number.isFinite(Number(o.shippingCents)) ? Number(o.shippingCents) : computedShipping;


                    return (
                        <div
                            key={o._id}
                            className={`list-group-item ${isOpen ? "border border-primary" : ""}`}
                        >

                            <button
                                type="button"
                                className="btn p-0 border-0 bg-transparent w-100 text-start"
                                onClick={() => setOpenId((prev) => (prev === o._id ? null : o._id))}
                                aria-expanded={isOpen}
                            >
                                <div className="d-flex justify-content-between align-items-start gap-3">
                                    <div>
                                        <div className="fw-semibold">
                                            Ordine {o.publicId || `#${o._id}`}
                                        </div>
                                        <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: 13 }}>
                                            <span className="text-muted">
                                                {formatDate(o.createdAt)} • {u.email || "utente"}
                                            </span>
                                            <span className={meta.badge}>{meta.label}</span>
                                        </div>

                                    </div>

                                    <div className="text-end">
                                        <div className="text-muted" style={{ fontSize: 13 }}>Totale</div>
                                        <div className="fw-semibold">{formatEURFromCents(o.totalCents)}</div>
                                    </div>
                                </div>
                            </button>

                            {isOpen ? (
                                <div className="mt-3 pt-3 border-top">

                                    <div className="mb-3">
                                        <div className="fw-semibold mb-2">Tracking spedizione</div>

                                        <div className="d-flex flex-wrap gap-2">
                                            <input
                                                className="form-control"
                                                style={{ maxWidth: 220 }}
                                                placeholder="Corriere (es. GLS)"
                                                value={draft.carrierName}
                                                onChange={(e) => setDraftField("carrierName", e.target.value)}
                                            />

                                            <input
                                                className="form-control"
                                                style={{ maxWidth: 260 }}
                                                placeholder="Codice tracking"
                                                value={draft.trackingCode}
                                                onChange={(e) => setDraftField("trackingCode", e.target.value)}
                                            />

                                            <input
                                                className="form-control"
                                                style={{ maxWidth: 360 }}
                                                placeholder="Link tracking"
                                                value={draft.trackingUrl}
                                                onChange={(e) => setDraftField("trackingUrl", e.target.value)}
                                            />
                                        </div>

                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                disabled={savingId === o._id || !canShip}
                                                onClick={() => setStatus(o._id, "shipped", draft)}
                                                title={!canShip ? "Inserisci codice tracking o link tracking" : ""}
                                            >
                                                {savingId === o._id ? "..." : "Segna come spedito + invia tracking"}
                                            </button>
                                        </div>
                                    </div>


                                    <div className="d-flex flex-wrap gap-2 align-items-center">

                                        <div className="fw-semibold me-2">Cambia stato:</div>
                                        {o.status === "pending_payment" ? (
                                            <div className="mb-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    disabled={savingId === o._id}
                                                    onClick={() => cancelOrder(o)}
                                                >
                                                    {savingId === o._id ? "..." : "Annulla ordine"}
                                                </button>
                                            </div>
                                        ) : null}

                                        {STATUS_OPTIONS.map((s) => (
                                            <button
                                                key={s.value}
                                                type="button"
                                                className={`btn btn-sm ${o.status === s.value ? "btn-primary" : "btn-outline-primary"
                                                    }`}
                                                disabled={savingId === o._id}
                                                onClick={() => (s.value === "shipped" ? setStatus(o._id, s.value, draft) : setStatus(o._id, s.value))}
                                            >
                                                {savingId === o._id ? "..." : s.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-3">
                                        <div className="fw-semibold mb-2">Riepilogo</div>

                                        <div className="list-group">
                                            <div className="list-group-item d-flex justify-content-between">
                                                <span className="text-muted">Subtotale</span>
                                                <span>{formatEURFromCents(subtotal)}</span>
                                            </div>

                                            {discount > 0 ? (
                                                <div className="list-group-item d-flex justify-content-between">
                                                    <span className="text-muted">{o.discountLabel || "Sconto"}</span>
                                                    <span>-{formatEURFromCents(discount)}</span>
                                                </div>
                                            ) : null}

                                            <div className="list-group-item d-flex justify-content-between">
                                                <span className="text-muted">Spedizione</span>
                                                <span>{shipping > 0 ? formatEURFromCents(shipping) : "Gratis"}</span>
                                            </div>

                                            <div className="list-group-item d-flex justify-content-between fw-semibold">
                                                <span>Totale</span>
                                                <span>{formatEURFromCents(totalCents)}</span>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
                                        ID: {o._id}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {!loading && orders.length === 0 ? (
                    <div className="list-group-item text-muted py-4">Nessun ordine trovato.</div>
                ) : null}
            </div>

            {loading ? <div className="text-muted mt-3">Caricamento...</div> : null}
        </div>
    );
}
