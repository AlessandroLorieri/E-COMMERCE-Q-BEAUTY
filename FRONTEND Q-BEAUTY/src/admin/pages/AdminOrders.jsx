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
    shipped: { label: "Spedito", badge: "qb-badge qb-badge-success" },
    completed: { label: "Consegnato", badge: "qb-badge qb-badge-success" },
    cancelled: { label: "Annullato", badge: "qb-badge qb-badge-danger" },
    refunded: { label: "Rimborsato", badge: "qb-badge qb-badge-dark" },
    draft: { label: "Bozza", badge: "qb-badge qb-badge-light" },
};

const MONTH_OPTIONS = [
    { value: "1", label: "Gennaio" },
    { value: "2", label: "Febbraio" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Aprile" },
    { value: "5", label: "Maggio" },
    { value: "6", label: "Giugno" },
    { value: "7", label: "Luglio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" },
];


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
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState("");
    const [q, setQ] = useState("");

    const [yearFilter, setYearFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");

    const [openId, setOpenId] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [trackingDraft, setTrackingDraft] = useState({});

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", String(limit));
        if (statusFilter) sp.set("status", statusFilter);
        if (q.trim()) sp.set("q", q.trim());
        if (yearFilter) sp.set("year", yearFilter);
        if (monthFilter) sp.set("month", monthFilter);
        return sp.toString();
    }, [page, limit, statusFilter, q, yearFilter, monthFilter]);

    async function apiFetch(path, options = {}) {
        let res;

        try {
            res = await authFetch(path, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    "Content-Type": "application/json",
                },
            });
        } catch (e) {
            if (e?.code === "SESSION_EXPIRED") {
                const next = encodeURIComponent("/admin/orders");
                navigate(`/shop/login?next=${next}`, { replace: true });
                throw new Error("Sessione scaduta, rifai login");
            }
            throw e;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data?.message || "Errore richiesta";
            const err = new Error(msg);
            err.payload = data;
            throw err;
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

    async function sendBankReminder(o) {
        if (!o || !o._id) return;

        const orderLabel = o.publicId || o._id;

        const ok = window.confirm(
            `Stai per inviare un sollecito di pagamento per l'ordine ${orderLabel}.\n\n` +
            `Il cliente verrà avvisato che, se non riceviamo la ricevuta del bonifico entro 24 ore, l'ordine verrà annullato.\n\n` +
            `Vuoi continuare?`
        );

        if (!ok) return;

        setErrMsg("");
        setSavingId(o._id);

        try {
            await apiFetch(`/api/orders/admin/${encodeURIComponent(o._id)}/bank-reminder`, {
                method: "POST",
                body: JSON.stringify({ confirm: true }),
            });

            await loadOrders();
        } catch (e) {
            setErrMsg(e.message || "Errore invio sollecito bonifico");
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

                <input
                    className="form-control"
                    style={{ maxWidth: 140 }}
                    type="number"
                    min={2000}
                    max={3000}
                    placeholder="Anno"
                    value={yearFilter}
                    onChange={(e) => {
                        const v = String(e.target.value || "");
                        setPage(1);
                        setYearFilter(v);

                        if (!v) {
                            setMonthFilter("");
                        }
                    }}
                />

                <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={monthFilter}
                    disabled={!yearFilter}
                    onChange={(e) => {
                        const v = e.target.value;
                        setPage(1);
                        setMonthFilter(v);
                    }}
                >
                    <option value="">Tutti i mesi</option>
                    {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                            {m.label}
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
                    const ship = o?.shippingAddress || {};
                    const shipName = ship?.name || "-";
                    const shipSurname = ship?.surname || "-";
                    const shipPhone = ship?.phone || "-";
                    const shipStreetNumber = ship?.streetNumber ? `, ${ship.streetNumber}` : "";
                    const shipAddressLine = ship?.address ? `${ship.address}${shipStreetNumber}` : "-";
                    const shipCityCap = `${ship?.city || "-"} (${ship?.cap || "-"})`;

                    const bill = o?.billingAddress || {};
                    const billName = bill?.name || ship?.name || "-";
                    const billSurname = bill?.surname || ship?.surname || "-";
                    const billEmail = bill?.email || ship?.email || u?.email || "-";
                    const billPhone = bill?.phone || ship?.phone || "-";

                    const billCompanyNameRaw =
                        bill?.companyName ||
                        bill?.businessName ||
                        bill?.ragioneSociale ||
                        bill?.denomination ||
                        o?.companyName ||
                        u?.companyName ||
                        "";

                    const billTaxCodeRaw =
                        bill?.taxCode ||
                        bill?.codiceFiscale ||
                        bill?.fiscalCode ||
                        o?.taxCode ||
                        u?.taxCode ||
                        "";

                    const billVatNumberRaw =
                        bill?.vatNumber ||
                        bill?.piva ||
                        bill?.partitaIva ||
                        o?.vatNumber ||
                        u?.vatNumber ||
                        "";

                    const billSdiCodeRaw =
                        bill?.sdiCode ||
                        bill?.codiceDestinatario ||
                        bill?.recipientCode ||
                        o?.sdiCode ||
                        u?.sdiCode ||
                        "";

                    const billPecRaw =
                        bill?.pec ||
                        bill?.pecAddress ||
                        o?.pec ||
                        u?.pec ||
                        "";

                    const billCompanyName = billCompanyNameRaw || "-";
                    const billTaxCode = billTaxCodeRaw || "-";
                    const billVatNumber = billVatNumberRaw || "-";
                    const billSdiCode = billSdiCodeRaw || "-";
                    const billPec = billPecRaw || "-";

                    const billStreetNumberValue = bill?.streetNumber || ship?.streetNumber || "";
                    const billStreetNumber = billStreetNumberValue ? `, ${billStreetNumberValue}` : "";
                    const billAddressBase = bill?.address || ship?.address || "";
                    const billAddressLine = billAddressBase ? `${billAddressBase}${billStreetNumber}` : "-";
                    const billCityCap = `${bill?.city || ship?.city || "-"} (${bill?.cap || ship?.cap || "-"})`;

                    const customerTypeRaw = String(o?.customerType || u?.customerType || "").trim().toLowerCase();
                    const isVatCustomer =
                        customerTypeRaw === "piva" ||
                        customerTypeRaw === "business" ||
                        customerTypeRaw === "company" ||
                        Boolean(billVatNumberRaw);

                    const items = Array.isArray(o?.items) ? o.items : [];

                    const paymentMethodLabel =
                        String(o?.paymentMethodLabel || "").trim() ||
                        (
                            o?.paymentProvider === "bank_transfer"
                                ? "Bonifico"
                                : o?.stripeCheckoutSessionId
                                    ? "Stripe"
                                    : "Non disponibile"
                        );

                    const paymentMethodDetail =
                        paymentMethodLabel === "Carta"
                            ? [
                                o?.paymentCardBrand ? String(o.paymentCardBrand).toUpperCase() : "",
                                o?.paymentCardLast4 ? `**** ${o.paymentCardLast4}` : "",
                            ]
                                .filter(Boolean)
                                .join(" • ")
                            : "";

                    const isBankTransferPayment =
                        String(o?.paymentMethodType || "").trim().toLowerCase() === "bank_transfer" ||
                        String(o?.paymentProvider || "").trim().toLowerCase() === "bank_transfer" ||
                        String(o?.paymentMethodLabel || "").trim().toLowerCase() === "bonifico";

                    const canSendBankReminder =
                        o.status === "pending_payment" &&
                        isBankTransferPayment;

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

                    function looksLikeUrl(s) {
                        const v = String(s || "").trim().toLowerCase();
                        return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("www.");
                    }

                    function normalizeUrlInput(s) {
                        const v = String(s || "").trim();
                        if (!v) return "";
                        if (/^https?:\/\//i.test(v)) return v;
                        return `https://${v}`;
                    }

                    // Validazioni
                    const trackingCodeIsUrl = looksLikeUrl(draft.trackingCode);

                    const normalizedUrl = normalizeUrlInput(draft.trackingUrl);
                    const trackingUrlOk = (() => {
                        if (!normalizedUrl) return false;
                        try {
                            const parsed = new URL(normalizedUrl);
                            return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
                        } catch {
                            return false;
                        }
                    })();

                    const trackingCodeError = trackingCodeIsUrl ? "Qui va il codice, non un link." : "";
                    const trackingUrlError = draft.trackingUrl && !trackingUrlOk ? "Inserisci un link valido (http/https)." : "";

                    const trackingNotified = Boolean(o?.shipment?.notifiedAt);

                    const hasTracking =
                        Boolean(String(draft.trackingCode || "").trim()) &&
                        trackingUrlOk &&
                        !trackingCodeIsUrl;

                    const canShipStatus = o.status === "processing" || o.status === "paid" || o.status === "shipped";
                    const canSendShipment = canShipStatus && hasTracking && !trackingNotified;

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

                                    <div className="row g-3 mb-3">
                                        <div className="col-12 col-lg-6">
                                            <div className="fw-semibold mb-2">Spedizione</div>
                                            <div style={{ fontSize: 14 }}>
                                                <div><span className="text-muted">Nome:</span> <b>{shipName}</b></div>
                                                <div><span className="text-muted">Cognome:</span> <b>{shipSurname}</b></div>
                                                <div><span className="text-muted">Telefono:</span> <b>{shipPhone}</b></div>
                                                <div><span className="text-muted">Indirizzo:</span> <b>{shipAddressLine}</b></div>
                                                <div><span className="text-muted">Città:</span> <b>{shipCityCap}</b></div>
                                            </div>
                                        </div>

                                        <div className="col-12 col-lg-6">
                                            <div className="fw-semibold mb-2">Fatturazione</div>
                                            <div style={{ fontSize: 14 }}>
                                                {isVatCustomer ? (
                                                    <>
                                                        <div><span className="text-muted">Ragione sociale:</span> <b>{billCompanyName}</b></div>
                                                        <div><span className="text-muted">Partita IVA:</span> <b>{billVatNumber}</b></div>
                                                        <div><span className="text-muted">Codice SDI:</span> <b>{billSdiCode}</b></div>
                                                        <div><span className="text-muted">PEC:</span> <b>{billPec}</b></div>
                                                    </>
                                                ) : null}

                                                <div><span className="text-muted">Nome:</span> <b>{billName}</b></div>
                                                <div><span className="text-muted">Cognome:</span> <b>{billSurname}</b></div>
                                                <div><span className="text-muted">Email:</span> <b>{billEmail}</b></div>
                                                <div><span className="text-muted">Telefono:</span> <b>{billPhone}</b></div>
                                                <div><span className="text-muted">Indirizzo:</span> <b>{billAddressLine}</b></div>
                                                <div><span className="text-muted">Città:</span> <b>{billCityCap}</b></div>
                                                <div><span className="text-muted">Codice fiscale:</span> <b>{billTaxCode}</b></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="fw-semibold mb-2">Pagamento</div>
                                        <div style={{ fontSize: 14 }}>
                                            <div><span className="text-muted">Metodo:</span> <b>{paymentMethodLabel}</b></div>
                                            {paymentMethodDetail ? (
                                                <div><span className="text-muted">Dettaglio:</span> <b>{paymentMethodDetail}</b></div>
                                            ) : null}
                                            {o?.paymentReminderSentAt ? (
                                                <div>
                                                    <span className="text-muted">Ultimo sollecito bonifico:</span>{" "}
                                                    <b>{formatDate(o.paymentReminderSentAt)}</b>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="fw-semibold mb-2">Articoli ordinati</div>

                                        {items.length ? (
                                            <div className="list-group">
                                                {items.map((it, idx) => (
                                                    <div
                                                        key={it.productRef || it.productId || idx}
                                                        className="list-group-item d-flex justify-content-between align-items-start"
                                                    >
                                                        <div>
                                                            <div className="fw-semibold">{it?.name || "Prodotto"}</div>
                                                            <div className="text-muted" style={{ fontSize: 13 }}>
                                                                Qta: {Number(it?.qty) || 1} • Prezzo: {formatEURFromCents(it?.unitPriceCents)}
                                                            </div>
                                                        </div>
                                                        <div className="fw-semibold">{formatEURFromCents(it?.lineTotalCents)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-muted" style={{ fontSize: 13 }}>
                                                Nessun articolo presente nell’ordine.
                                            </div>
                                        )}
                                    </div>

                                    {String(o.note || "").trim() ? (
                                        <div className="mb-3">
                                            <div className="fw-semibold mb-2">Note ordine</div>
                                            <div className="list-group">
                                                <div className="list-group-item" style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
                                                    {o.note}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

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

                                    <div className="mb-3 mt-5">
                                        <div className="fw-semibold mb-2">Tracking spedizione</div>

                                        <div className="d-flex flex-wrap gap-2">
                                            <input
                                                className="form-control"
                                                style={{ maxWidth: 220 }}
                                                placeholder="Corriere (es. GLS)"
                                                value={draft.carrierName}
                                                onChange={(e) => setDraftField("carrierName", e.target.value)}
                                                disabled={savingId === o._id || trackingNotified}
                                            />

                                            <input
                                                className="form-control"
                                                style={{ maxWidth: 260 }}
                                                placeholder="Codice spedizione"
                                                value={draft.trackingCode}
                                                onChange={(e) => {
                                                    const v = String(e.target.value || "");
                                                    if (looksLikeUrl(v)) return;
                                                    setDraftField("trackingCode", v);
                                                }}
                                                disabled={savingId === o._id || trackingNotified}
                                            />

                                            <input
                                                type="url"
                                                className="form-control"
                                                style={{ maxWidth: 360 }}
                                                placeholder="Link tracking"
                                                value={draft.trackingUrl}
                                                onChange={(e) => setDraftField("trackingUrl", normalizeUrlInput(e.target.value))}
                                                disabled={savingId === o._id || trackingNotified}
                                            />
                                        </div>

                                        {(trackingCodeError || trackingUrlError) ? (
                                            <div className="text-danger mt-2" style={{ fontSize: 13 }}>
                                                {trackingCodeError || trackingUrlError}
                                            </div>
                                        ) : null}

                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${trackingNotified ? "btn-success" : "btn-primary"}`}
                                                disabled={savingId === o._id || !canSendShipment}
                                                onClick={() => setStatus(o._id, "shipped", draft)}
                                                title={
                                                    trackingNotified
                                                        ? "Tracking già inviato"
                                                        : !canShipStatus
                                                            ? "Puoi spedire solo se l'ordine è Pagato/In preparazione"
                                                            : !hasTracking
                                                                ? "Inserisci codice tracking e link tracking"
                                                                : ""
                                                }
                                            >
                                                {savingId === o._id ? "..." : trackingNotified ? "Tracking inviato ✅" : "Segna come spedito + invia tracking"}
                                            </button>
                                        </div>
                                    </div>

                                    {canSendBankReminder ? (
                                        <div className="mb-3">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-warning"
                                                disabled={savingId === o._id}
                                                onClick={() => sendBankReminder(o)}
                                            >
                                                {savingId === o._id ? "..." : "Invia sollecito bonifico"}
                                            </button>
                                        </div>
                                    ) : null}

                                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">

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
