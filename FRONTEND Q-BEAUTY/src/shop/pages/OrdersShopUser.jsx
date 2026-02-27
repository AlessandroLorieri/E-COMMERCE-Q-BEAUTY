import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";
import BrandSpinner from "../components/BrandSpinner";
import { formatEURFromCents } from "../utils/money";

import "./OrderShopUser.css";

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

function statusMeta(status) {
    const s = (status || "").trim();
    return (
        STATUS_META[s] || {
            label: s || "-",
            badge: "bg-light text-dark",
        }
    );
}

export default function OrdersShop() {
    const navigate = useNavigate();

    const { user, loading, token } = useAuth();
    const { fetchMyOrders } = useShop();

    const apiBase = useMemo(() => import.meta.env.VITE_API_URL, []);

    const [orders, setOrders] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState("");
    const [openOrderId, setOpenOrderId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const [payingOrderId, setPayingOrderId] = useState(null);

    useEffect(() => {
        if (loading) return;
        if (!user) navigate("/shop/login?next=/shop/orders", { replace: true });
    }, [user, loading, navigate]);

    const loadOrders = useCallback(
        async (opts = {}) => {
            const silent = !!opts.silent;

            if (loading || !user) return;

            if (silent) setRefreshing(true);
            else setPageLoading(true);

            setError("");

            try {
                const list = await fetchMyOrders();
                setOrders(list);
            } catch (err) {
                setError(err.message || "Errore caricamento ordini");
            } finally {
                if (silent) setRefreshing(false);
                else setPageLoading(false);
            }
        },
        [user, loading, fetchMyOrders]
    );

    useEffect(() => {
        if (loading) return;
        if (!user) return;

        loadOrders({ silent: false });

        const t = setInterval(() => {
            loadOrders({ silent: true });
        }, 30000);

        return () => clearInterval(t);
    }, [user, loading, loadOrders]);

    async function startStripePayment(orderId) {
        if (!apiBase) {
            setError("VITE_API_URL non configurata.");
            return;
        }
        if (!token) {
            setError("Token mancante. Rifai login.");
            return;
        }

        setError("");
        setPayingOrderId(orderId);

        try {
            const res = await fetch(`${apiBase}/api/payments/stripe/checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify({ orderId }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Errore creazione sessione Stripe");
            if (!data?.url) throw new Error("Stripe non ha restituito la URL di checkout");

            window.location.assign(data.url);
        } catch (e) {
            setError(e?.message || "Errore avvio pagamento");
            setPayingOrderId(null);
        }
    }

    if (loading || (pageLoading && orders.length === 0)) {
        return <BrandSpinner text="Carico i tuoi ordini..." />;
    }

    if (!user) return null;

    return (
        <div className="container py-4 shop-orders" style={{ maxWidth: 920 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h1 className="mb-0">I miei ordini</h1>
                    {refreshing || pageLoading ? (
                        <div className="text-muted" style={{ fontSize: 13 }}>
                            Aggiornamento stato in corso...
                        </div>
                    ) : null}
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn shop-btn-outline"
                        onClick={() => loadOrders({ silent: false })}
                        disabled={loading || pageLoading}
                    >
                        Aggiorna
                    </button>

                    <Link to="/shop" className="btn shop-btn-outline">
                        Torna allo shop
                    </Link>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger py-2" role="alert">
                    {error}
                </div>
            )}

            {!error && orders.length === 0 ? (
                <div className="card p-3 shop-orders-empty">
                    <p className="mb-0">Non hai ancora ordini.</p>
                </div>
            ) : (
                <div className="list-group">
                    {orders.map((o) => {
                        const isOpen = openOrderId === o._id;
                        const ship = o.shippingAddress || {};
                        const meta = statusMeta(o.status);

                        return (
                            <div
                                key={o._id}
                                className={`list-group-item shop-order-item ${isOpen ? "is-open" : ""}`}
                                style={isOpen ? { marginBottom: 12 } : undefined}
                            >
                                <button
                                    type="button"
                                    className="btn p-0 border-0 bg-transparent w-100 text-start"
                                    onClick={() => setOpenOrderId((prev) => (prev === o._id ? null : o._id))}
                                    aria-expanded={isOpen}
                                >
                                    <div className="d-flex justify-content-between align-items-start gap-3">
                                        <div>
                                            <div className="fw-semibold">Ordine {o.publicId || `#${o._id}`}</div>
                                            <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                                                <span>{formatDate(o.createdAt)}</span>
                                                <span>•</span>
                                                <span className={`badge ${meta.badge}`}>{meta.label}</span>
                                            </div>
                                        </div>

                                        <div className="text-end">
                                            <div className="text-muted" style={{ fontSize: 13 }}>
                                                Totale ordine
                                            </div>
                                            <div className="fw-semibold">{formatEURFromCents(o.totalCents)}</div>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-muted" style={{ fontSize: 13 }}>
                                        Articoli:{" "}
                                        {Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.qty || 0), 0) : 0}
                                        <span className="ms-2">{isOpen ? "▲ Nascondi" : "▼ Dettagli"}</span>
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="mt-3 pt-3 border-top">
                                        {/* AZIONE PAGAMENTO */}
                                        {o.status === "pending_payment" ? (
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                    Pagamento non completato. Puoi riprendere il checkout.
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn shop-btn-primary"
                                                    onClick={() => startStripePayment(o._id)}
                                                    disabled={!!payingOrderId}
                                                >
                                                    {payingOrderId === o._id ? "Apro Stripe..." : "Completa pagamento"}
                                                </button>
                                            </div>
                                        ) : null}

                                        <div className="fw-semibold mb-2">Prodotti</div>

                                        <div className="list-group mb-3 shop-order-products">
                                            {(o.items || []).map((it, idx) => (
                                                <div key={idx} className="list-group-item shop-order-product-item">
                                                    <div className="d-flex justify-content-between">
                                                        <div>
                                                            <div className="fw-semibold">{it.name}</div>
                                                            <div className="text-muted" style={{ fontSize: 13 }}>
                                                                {it.qty} × {formatEURFromCents(it.unitPriceCents)}
                                                            </div>
                                                        </div>
                                                        <div className="fw-semibold">{formatEURFromCents(it.lineTotalCents)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-12 col-lg-4">
                                                <div className="fw-semibold mb-2">Spedizione</div>
                                                <div style={{ fontSize: 14 }}>
                                                    <div>
                                                        {ship.name} {ship.surname}
                                                    </div>
                                                    {ship.email ? <div className="text-muted">{ship.email}</div> : null}
                                                    <div className="mt-2">{ship.address}</div>
                                                    <div>
                                                        {ship.city} ({ship.cap})
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 col-lg-4">
                                                <div className="fw-semibold mb-2">Fatturazione</div>
                                                <div style={{ fontSize: 14 }}>
                                                    {user?.customerType === "piva" ? (
                                                        <>
                                                            <div className="fw-semibold">{user.companyName || "Ragione sociale"}</div>
                                                            {user.vatNumber ? <div>P.IVA: {user.vatNumber}</div> : null}
                                                            <div className="text-muted">{user.email}</div>

                                                            <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                                                                Indirizzo fatturazione: uguale a spedizione
                                                            </div>
                                                            <div>{ship.address}</div>
                                                            <div>
                                                                {ship.city} ({ship.cap})
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="fw-semibold">
                                                                {ship.name} {ship.surname}
                                                            </div>
                                                            <div className="text-muted">{user?.email || ship.email}</div>

                                                            <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                                                                Indirizzo fatturazione: uguale a spedizione
                                                            </div>
                                                            <div>{ship.address}</div>
                                                            <div>
                                                                {ship.city} ({ship.cap})
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-12 col-lg-4">
                                                <div className="fw-semibold mb-2">Totali</div>

                                                <div className="d-flex justify-content-between">
                                                    <span>Subtotale</span>
                                                    <strong>{formatEURFromCents(o.subtotalCents)}</strong>
                                                </div>

                                                {o.discountCents > 0 && (
                                                    <div className="d-flex justify-content-between mt-2">
                                                        <span>{o.discountLabel}</span>
                                                        <strong>- {formatEURFromCents(o.discountCents)}</strong>
                                                    </div>
                                                )}

                                                <div className="d-flex justify-content-between mt-2">
                                                    <span>Spedizione</span>
                                                    <strong>
                                                        {o.shippingCents === 0 ? "Gratis" : formatEURFromCents(o.shippingCents || 0)}
                                                    </strong>
                                                </div>

                                                <hr />

                                                <div className="d-flex justify-content-between">
                                                    <span>Totale</span>
                                                    <strong>{formatEURFromCents(o.totalCents)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
