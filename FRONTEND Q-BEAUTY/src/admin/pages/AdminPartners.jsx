import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../shop/context/AuthContext";
import Seo from "../../components/Seo";

import "./AdminPartners.css";

const EMPTY_FORM = {
    name: "",
    contactPersonName: "",
    slug: "",
    address: "",
    cap: "",
    city: "",
    province: "",
    region: "",
    lat: "",
    lng: "",
    phone: "",
    email: "",
    partnerCouponCode: "",
    partnerCouponEnabled: false,
    website: "",
    instagram: "",
    personalInstagram: "",
    services: "",
    treatments: "",
    description: "",
    image: "",
    gallery: "",
    isActive: true,
    sortOrder: "0",
};

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeSlug(v) {
    return String(v || "")
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function toTextareaValue(value) {
    if (Array.isArray(value)) return value.join("\n");
    return String(value || "");
}

const ASSOCIATION_EXPIRING_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOrNull(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function formatDateIT(value) {
    const date = parseDateOrNull(value);
    if (!date) return "—";

    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatMoneyCents(value) {
    const cents = Number(value) || 0;

    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
    }).format(cents / 100);
}

function formatOrderStatus(status) {
    const map = {
        draft: "Bozza",
        pending_payment: "In attesa pagamento",
        paid: "Pagato",
        processing: "In lavorazione",
        shipped: "Spedito",
        completed: "Completato",
        cancelled: "Annullato",
        refunded: "Rimborsato",
    };

    return map[status] || status || "—";
}

function getOrderStatusBadgeClass(status) {
    const map = {
        draft: "text-bg-secondary",
        pending_payment: "text-bg-warning",
        paid: "text-bg-success",
        processing: "text-bg-primary",
        shipped: "text-bg-info",
        completed: "text-bg-success",
        cancelled: "text-bg-danger",
        refunded: "text-bg-dark",
    };

    return map[status] || "text-bg-secondary";
}

function getDaysUntil(value) {
    const date = parseDateOrNull(value);
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target.getTime() - today.getTime()) / DAY_MS);
}

function getPartnerAssociationStatus(partner) {
    const expiresAt = parseDateOrNull(partner?.associationExpiresAt);

    if (!expiresAt) {
        return {
            key: "never",
            label: "Mai attivata",
            badgeClass: "text-bg-secondary",
            alertClass: "alert-secondary",
        };
    }

    const daysLeft = getDaysUntil(expiresAt);

    if (daysLeft < 0) {
        const daysExpired = Math.abs(daysLeft);

        return {
            key: "expired",
            label: daysExpired === 1 ? "Scaduta da 1 giorno" : `Scaduta da ${daysExpired} giorni`,
            badgeClass: "text-bg-danger",
            alertClass: "alert-danger",
        };
    }

    if (daysLeft === 0) {
        return {
            key: "expiring",
            label: "Scade oggi",
            badgeClass: "text-bg-warning",
            alertClass: "alert-warning",
        };
    }

    if (daysLeft <= ASSOCIATION_EXPIRING_DAYS) {
        return {
            key: "expiring",
            label: `Scade tra ${daysLeft} giorni`,
            badgeClass: "text-bg-warning",
            alertClass: "alert-warning",
        };
    }

    return {
        key: "active",
        label: `Attiva fino al ${formatDateIT(expiresAt)}`,
        badgeClass: "text-bg-success",
        alertClass: "alert-success",
    };
}

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-admin-partners-script";

function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
        if (window.google?.maps) {
            resolve(window.google.maps);
            return;
        }

        const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
        if (existing) {
            existing.addEventListener("load", () => resolve(window.google.maps));
            existing.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google.maps);
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

function AdminPartnerMapPicker({ lat, lng, onPick }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!apiKey) return;

        let cancelled = false;

        async function initMap() {
            try {
                await loadGoogleMaps(apiKey);

                if (cancelled) return;

                const parsedLat = Number(String(lat || "").replace(",", "."));
                const parsedLng = Number(String(lng || "").replace(",", "."));

                const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

                const center = hasCoords
                    ? { lat: parsedLat, lng: parsedLng }
                    : { lat: 44.8015, lng: 10.3279 };

                const el = document.getElementById("adminPartnerMapPicker");
                if (!el) return;

                const map = new window.google.maps.Map(el, {
                    center,
                    zoom: hasCoords ? 15 : 7,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                });

                const marker = new window.google.maps.Marker({
                    position: hasCoords ? center : null,
                    map,
                    draggable: true,
                });

                map.addListener("click", (event) => {
                    const nextLat = event.latLng.lat();
                    const nextLng = event.latLng.lng();

                    marker.setPosition({ lat: nextLat, lng: nextLng });

                    onPick({
                        lat: nextLat.toFixed(7),
                        lng: nextLng.toFixed(7),
                    });
                });

                marker.addListener("dragend", (event) => {
                    onPick({
                        lat: event.latLng.lat().toFixed(7),
                        lng: event.latLng.lng().toFixed(7),
                    });
                });
            } catch (err) {
                console.error("Errore caricamento Google Maps:", err);
            }
        }

        initMap();

        return () => {
            cancelled = true;
        };
    }, [apiKey, lat, lng, onPick]);

    if (!apiKey) {
        return (
            <div className="alert alert-warning py-2 mt-2">
                VITE_GOOGLE_MAPS_API_KEY mancante nel file .env del frontend.
            </div>
        );
    }

    return (
        <div className="admin-partners-map-wrap mt-2">
            <div id="adminPartnerMapPicker" className="admin-partners-map" />
            <div className="form-text mt-1">
                Clicca sulla mappa o trascina il marker per impostare latitudine e longitudine.
            </div>
        </div>
    );
}

export default function AdminPartners() {
    const { authFetch } = useAuth();
    const apiBase = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [submitOk, setSubmitOk] = useState("");
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState("");
    const [expandedPartnerId, setExpandedPartnerId] = useState("");

    const [partnerOrdersById, setPartnerOrdersById] = useState({});
    const [partnerOrdersLoadingById, setPartnerOrdersLoadingById] = useState({});
    const [partnerOrdersErrorById, setPartnerOrdersErrorById] = useState({});

    async function loadPartners() {
        if (!apiBase) {
            setError("VITE_API_URL mancante");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await authFetch("/api/partners/admin");
            const data = await res.json().catch(() => ([]));

            if (!res.ok) {
                throw new Error(data?.message || "Errore caricamento partner");
            }

            setPartners(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Errore caricamento partner");
            setPartners([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadPartnerOrders(partnerIdRaw) {
        const partnerId = String(partnerIdRaw || "");
        if (!partnerId) return;

        setPartnerOrdersLoadingById((prev) => ({
            ...prev,
            [partnerId]: true,
        }));

        setPartnerOrdersErrorById((prev) => ({
            ...prev,
            [partnerId]: "",
        }));

        try {
            const res = await authFetch(`/api/partners/admin/${partnerId}/orders`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.message || "Errore caricamento ordini partner");
            }

            setPartnerOrdersById((prev) => ({
                ...prev,
                [partnerId]: data,
            }));
        } catch (err) {
            setPartnerOrdersErrorById((prev) => ({
                ...prev,
                [partnerId]: err.message || "Errore caricamento ordini partner",
            }));
        } finally {
            setPartnerOrdersLoadingById((prev) => ({
                ...prev,
                [partnerId]: false,
            }));
        }
    }

    useEffect(() => {
        loadPartners();
    }, []);

    function resetForm() {
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setSubmitError("");
        setSubmitOk("");
        setEditingId("");
    }

    function togglePartnerDetails(id) {
        const partnerId = String(id || "");
        if (!partnerId) return;

        const isOpening = expandedPartnerId !== partnerId;

        setExpandedPartnerId(isOpening ? partnerId : "");

        if (
            isOpening &&
            !partnerOrdersById[partnerId] &&
            !partnerOrdersLoadingById[partnerId]
        ) {
            loadPartnerOrders(partnerId);
        }
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        setSubmitError("");
        setSubmitOk("");

        setFieldErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }

    function handleAutoSlug() {
        setForm((prev) => ({
            ...prev,
            slug: normalizeSlug(prev.name),
        }));
    }

    function startEdit(partner) {
        setEditingId(String(partner._id || ""));

        setForm({
            name: partner.name || "",
            contactPersonName: partner.contactPersonName || "",
            slug: partner.slug || "",
            address: partner.address || "",
            cap: partner.cap || "",
            city: partner.city || "",
            province: partner.province || "",
            region: partner.region || "",
            lat: partner.lat ?? "",
            lng: partner.lng ?? "",
            phone: partner.phone || "",
            email: partner.email || "",
            partnerCouponCode: partner.partnerCouponCode || "",
            partnerCouponEnabled: Boolean(partner.partnerCouponEnabled),
            website: partner.website || "",
            instagram: partner.instagram || "",
            personalInstagram: partner.personalInstagram || "",
            services: toTextareaValue(partner.services),
            treatments: toTextareaValue(partner.treatments),
            description: partner.description || "",
            image: partner.image || "",
            gallery: toTextareaValue(partner.gallery),
            isActive: Boolean(partner.isActive),
            sortOrder: String(partner.sortOrder ?? 0),
        });

        setFieldErrors({});
        setSubmitError("");
        setSubmitOk("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleMapPick(coords) {
        setForm((prev) => ({
            ...prev,
            lat: coords.lat,
            lng: coords.lng,
        }));

        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.lat;
            delete next.lng;
            return next;
        });

        setSubmitError("");
        setSubmitOk("");
    }

    const payload = useMemo(() => {
        return {
            name: normalizeText(form.name),
            contactPersonName: normalizeText(form.contactPersonName),
            slug: normalizeSlug(form.slug),
            address: normalizeText(form.address),
            cap: normalizeText(form.cap),
            city: normalizeText(form.city),
            province: normalizeText(form.province).toUpperCase(),
            region: normalizeText(form.region),
            lat: normalizeText(form.lat),
            lng: normalizeText(form.lng),
            phone: normalizeText(form.phone),
            email: normalizeText(form.email),
            partnerCouponCode: normalizeText(form.partnerCouponCode).toUpperCase().replace(/\s+/g, ""),
            partnerCouponEnabled: Boolean(form.partnerCouponEnabled),
            website: normalizeText(form.website),
            instagram: normalizeText(form.instagram),
            personalInstagram: normalizeText(form.personalInstagram),
            services: form.services,
            treatments: form.treatments,
            description: normalizeText(form.description),
            image: normalizeText(form.image),
            gallery: form.gallery,
            isActive: Boolean(form.isActive),
            sortOrder: normalizeText(form.sortOrder),
        };
    }, [form]);

    const associationSummary = useMemo(() => {
        const rows = partners.map((partner) => ({
            partner,
            status: getPartnerAssociationStatus(partner),
        }));

        const activeRows = rows.filter((row) => row.status.key === "active" || row.status.key === "expiring");
        const expiringRows = rows.filter((row) => row.status.key === "expiring");
        const expiredRows = rows.filter((row) => row.status.key === "expired");
        const neverRows = rows.filter((row) => row.status.key === "never");

        return {
            activeRows,
            expiringRows,
            expiredRows,
            neverRows,
            activeCount: activeRows.length,
            expiringCount: expiringRows.length,
            expiredCount: expiredRows.length,
            neverCount: neverRows.length,
        };
    }, [partners]);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setSubmitError("");
        setSubmitOk("");
        setFieldErrors({});

        try {
            const isEdit = !!editingId;

            const res = await authFetch(
                isEdit ? `/api/partners/admin/${editingId}` : "/api/partners/admin",
                {
                    method: isEdit ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (data?.errors && typeof data.errors === "object") {
                    setFieldErrors(data.errors);
                    throw new Error("Controlla i campi evidenziati in rosso.");
                }

                throw new Error(data?.message || (isEdit ? "Errore modifica partner" : "Errore creazione partner"));
            }

            setSubmitOk(isEdit ? "Partner aggiornato ✅" : "Partner creato ✅");
            resetForm();
            await loadPartners();
        } catch (err) {
            setSubmitError(err.message || "Errore salvataggio partner");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        const confirmed = window.confirm("Vuoi eliminare questo partner?");
        if (!confirmed) return;

        setError("");

        try {
            const res = await authFetch(`/api/partners/admin/${id}`, {
                method: "DELETE",
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.message || "Errore eliminazione partner");
            }

            if (editingId === String(id)) {
                resetForm();
            }

            if (expandedPartnerId === String(id)) {
                setExpandedPartnerId("");
            }

            setPartnerOrdersById((prev) => {
                const next = { ...prev };
                delete next[String(id)];
                return next;
            });

            setPartnerOrdersLoadingById((prev) => {
                const next = { ...prev };
                delete next[String(id)];
                return next;
            });

            setPartnerOrdersErrorById((prev) => {
                const next = { ...prev };
                delete next[String(id)];
                return next;
            });

            await loadPartners();
        } catch (err) {
            setError(err.message || "Errore eliminazione partner");
        }
    }

    return (
        <>
            <Seo
                title="Admin Partner | Q•BEAUTY"
                description="Gestione partner Q•BEAUTY."
                canonical="/admin/partners"
                noindex
            />

            <div className="container py-4 admin-partners-page">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="mb-0">Partner</h1>

                    {editingId ? (
                        <button
                            type="button"
                            className="btn btn-outline-light btn-sm"
                            onClick={resetForm}
                        >
                            Nuovo partner
                        </button>
                    ) : null}
                </div>

                <div className="row g-4">
                    <div className="col-12 col-xl-5">
                        <div className="card p-3 admin-partners-card">
                            <h5 className="mb-3">
                                {editingId ? "Modifica partner" : "Nuovo partner"}
                            </h5>

                            {submitError ? (
                                <div className="alert alert-danger py-2" role="alert">
                                    {submitError}
                                </div>
                            ) : null}

                            {submitOk ? (
                                <div className="alert alert-success py-2" role="alert">
                                    {submitOk}
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="row g-2">
                                    <div className="col-12">
                                        <label className="form-label">Nome Centro</label>
                                        <input
                                            className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.name ? <div className="invalid-feedback">{fieldErrors.name}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Referente</label>
                                        <input
                                            className={`form-control ${fieldErrors.contactPersonName ? "is-invalid" : ""}`}
                                            name="contactPersonName"
                                            value={form.contactPersonName}
                                            onChange={handleChange}
                                            placeholder="Es. Camilla Mangino"
                                        />
                                        {fieldErrors.contactPersonName ? (
                                            <div className="invalid-feedback">{fieldErrors.contactPersonName}</div>
                                        ) : null}
                                        <div className="form-text">
                                            Nome della persona referente del centro. Verrà mostrato sotto al nome del partner.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label d-flex justify-content-between align-items-center">
                                            <span>Slug</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={handleAutoSlug}
                                            >
                                                Genera da nome
                                            </button>
                                        </label>
                                        <input
                                            className={`form-control ${fieldErrors.slug ? "is-invalid" : ""}`}
                                            name="slug"
                                            value={form.slug}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.slug ? <div className="invalid-feedback">{fieldErrors.slug}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Indirizzo</label>
                                        <input
                                            className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`}
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.address ? <div className="invalid-feedback">{fieldErrors.address}</div> : null}
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <label className="form-label">CAP</label>
                                        <input
                                            className={`form-control ${fieldErrors.cap ? "is-invalid" : ""}`}
                                            name="cap"
                                            value={form.cap}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.cap ? <div className="invalid-feedback">{fieldErrors.cap}</div> : null}
                                    </div>

                                    <div className="col-12 col-md-5">
                                        <label className="form-label">Città</label>
                                        <input
                                            className={`form-control ${fieldErrors.city ? "is-invalid" : ""}`}
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.city ? <div className="invalid-feedback">{fieldErrors.city}</div> : null}
                                    </div>

                                    <div className="col-12 col-md-3">
                                        <label className="form-label">Provincia</label>
                                        <input
                                            className={`form-control ${fieldErrors.province ? "is-invalid" : ""}`}
                                            name="province"
                                            value={form.province}
                                            onChange={handleChange}
                                            maxLength={2}
                                        />
                                        {fieldErrors.province ? <div className="invalid-feedback">{fieldErrors.province}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Regione</label>
                                        <input
                                            className={`form-control ${fieldErrors.region ? "is-invalid" : ""}`}
                                            name="region"
                                            value={form.region}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.region ? <div className="invalid-feedback">{fieldErrors.region}</div> : null}
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Latitudine</label>
                                        <input
                                            className={`form-control ${fieldErrors.lat ? "is-invalid" : ""}`}
                                            name="lat"
                                            value={form.lat}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.lat ? <div className="invalid-feedback">{fieldErrors.lat}</div> : null}
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Longitudine</label>
                                        <input
                                            className={`form-control ${fieldErrors.lng ? "is-invalid" : ""}`}
                                            name="lng"
                                            value={form.lng}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.lng ? <div className="invalid-feedback">{fieldErrors.lng}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <AdminPartnerMapPicker
                                            lat={form.lat}
                                            lng={form.lng}
                                            onPick={handleMapPick}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Telefono</label>
                                        <input
                                            className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="Es. 3451234567"
                                        />
                                        {fieldErrors.phone ? (
                                            <div className="invalid-feedback">{fieldErrors.phone}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Email</label>
                                        <input
                                            className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="Es. info@centroestetico.it"
                                        />
                                        {fieldErrors.email ? (
                                            <div className="invalid-feedback">{fieldErrors.email}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Codice coupon partner</label>
                                        <input
                                            className={`form-control ${fieldErrors.partnerCouponCode ? "is-invalid" : ""}`}
                                            name="partnerCouponCode"
                                            value={form.partnerCouponCode}
                                            onChange={handleChange}
                                            placeholder="Es. BEAUTYLAB30"
                                            autoCapitalize="characters"
                                            autoCorrect="off"
                                            spellCheck={false}
                                        />
                                        {fieldErrors.partnerCouponCode ? (
                                            <div className="invalid-feedback">{fieldErrors.partnerCouponCode}</div>
                                        ) : null}
                                        <div className="form-text">
                                            Facoltativo. Se compilato, questo codice potrà abilitare lo sconto partner -30% con almeno 30 pezzi.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="partnerCouponEnabled"
                                                name="partnerCouponEnabled"
                                                checked={form.partnerCouponEnabled}
                                                onChange={handleChange}
                                            />
                                            <label className="form-check-label" htmlFor="partnerCouponEnabled">
                                                Codice partner abilitato
                                            </label>
                                        </div>

                                        <div className="form-text">
                                            Se attivo, il codice partner potrà essere usato nel carrello anche se il partner non è visibile nello shop.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Sito web</label>
                                        <input
                                            className={`form-control ${fieldErrors.website ? "is-invalid" : ""}`}
                                            name="website"
                                            value={form.website}
                                            onChange={handleChange}
                                            placeholder="Es. https://www.centroestetico.it"
                                        />
                                        {fieldErrors.website ? (
                                            <div className="invalid-feedback">{fieldErrors.website}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Instagram negozio</label>
                                        <input
                                            className={`form-control ${fieldErrors.instagram ? "is-invalid" : ""}`}
                                            name="instagram"
                                            value={form.instagram}
                                            onChange={handleChange}
                                            placeholder="Es. https://www.instagram.com/nomecentro"
                                        />
                                        {fieldErrors.instagram ? (
                                            <div className="invalid-feedback">{fieldErrors.instagram}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Instagram personale</label>
                                        <input
                                            className={`form-control ${fieldErrors.personalInstagram ? "is-invalid" : ""}`}
                                            name="personalInstagram"
                                            value={form.personalInstagram}
                                            onChange={handleChange}
                                            placeholder="Es. https://www.instagram.com/nomecognome"
                                        />
                                        {fieldErrors.personalInstagram ? (
                                            <div className="invalid-feedback">{fieldErrors.personalInstagram}</div>
                                        ) : null}
                                        <div className="form-text">
                                            Facoltativo. Profilo personale della referente o della titolare.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Servizi</label>
                                        <textarea
                                            className={`form-control ${fieldErrors.services ? "is-invalid" : ""}`}
                                            name="services"
                                            value={form.services}
                                            onChange={handleChange}
                                            rows={3}
                                            placeholder={"Un servizio per riga\nProdotti\nTrattamenti"}
                                        />
                                        {fieldErrors.services ? <div className="invalid-feedback">{fieldErrors.services}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Trattamenti</label>
                                        <textarea
                                            className={`form-control ${fieldErrors.treatments ? "is-invalid" : ""}`}
                                            name="treatments"
                                            value={form.treatments}
                                            onChange={handleChange}
                                            rows={3}
                                            placeholder={"Un trattamento per riga"}
                                        />
                                        {fieldErrors.treatments ? (
                                            <div className="invalid-feedback">{fieldErrors.treatments}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Descrizione</label>
                                        <textarea
                                            className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={6}
                                        />
                                        {fieldErrors.description ? <div className="invalid-feedback">{fieldErrors.description}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Immagine principale (URL R2)</label>
                                        <input
                                            className={`form-control ${fieldErrors.image ? "is-invalid" : ""}`}
                                            name="image"
                                            value={form.image}
                                            onChange={handleChange}
                                        />
                                        {fieldErrors.image ? <div className="invalid-feedback">{fieldErrors.image}</div> : null}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Gallery (URL R2, uno per riga)</label>
                                        <textarea
                                            className={`form-control ${fieldErrors.gallery ? "is-invalid" : ""}`}
                                            name="gallery"
                                            value={form.gallery}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder={"Un URL per riga"}
                                        />
                                        {fieldErrors.gallery ? (
                                            <div className="invalid-feedback">{fieldErrors.gallery}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Ordine visualizzazione</label>
                                        <input
                                            className={`form-control ${fieldErrors.sortOrder ? "is-invalid" : ""}`}
                                            name="sortOrder"
                                            value={form.sortOrder}
                                            onChange={handleChange}
                                            placeholder="Es. 0"
                                        />
                                        {fieldErrors.sortOrder ? (
                                            <div className="invalid-feedback">{fieldErrors.sortOrder}</div>
                                        ) : null}
                                    </div>

                                    <div className="col-12 col-md-6 d-flex align-items-end">
                                        <div>
                                            <div className="form-check mb-1">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="partnerIsActive"
                                                    name="isActive"
                                                    checked={form.isActive}
                                                    onChange={handleChange}
                                                />
                                                <label className="form-check-label" htmlFor="partnerIsActive">
                                                    Visibile nella pagina partner
                                                </label>
                                            </div>

                                            <div className="form-text">
                                                Se disattivato, il partner non è visibile nella sezione dedicata ma il codice sconto può funzionare se abilitato.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex gap-2 mt-3">
                                    <button className="btn btn-primary" type="submit" disabled={saving}>
                                        {saving ? "Salvo..." : editingId ? "Salva modifiche" : "Crea partner"}
                                    </button>

                                    {editingId ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={resetForm}
                                            disabled={saving}
                                        >
                                            Annulla
                                        </button>
                                    ) : null}
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="col-12 col-xl-7">
                        <div className="card p-3 admin-partners-card">
                            <div className="mb-4">
                                <h5 className="mb-3">Agevolazioni partner</h5>

                                <div className="row g-2 mb-3">
                                    <div className="col-6 col-lg-3">
                                        <div className="alert alert-success py-2 px-3 mb-0">
                                            <div className="fw-semibold">{associationSummary.activeCount}</div>
                                            <div style={{ fontSize: 13 }}>Agevolazioni attive</div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="alert alert-warning py-2 px-3 mb-0">
                                            <div className="fw-semibold">{associationSummary.expiringCount}</div>
                                            <div style={{ fontSize: 13 }}>In scadenza</div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="alert alert-danger py-2 px-3 mb-0">
                                            <div className="fw-semibold">{associationSummary.expiredCount}</div>
                                            <div style={{ fontSize: 13 }}>Scaduti</div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="alert alert-secondary py-2 px-3 mb-0">
                                            <div className="fw-semibold">{associationSummary.neverCount}</div>
                                            <div style={{ fontSize: 13 }}>Mai attivate</div>
                                        </div>
                                    </div>
                                </div>

                                {associationSummary.expiringRows.length || associationSummary.expiredRows.length ? (
                                    <div className="border rounded-3 p-3">
                                        {associationSummary.expiringRows.length ? (
                                            <div className="mb-3">
                                                <div className="fw-semibold mb-2">In scadenza entro {ASSOCIATION_EXPIRING_DAYS} giorni</div>

                                                <div className="d-grid gap-2">
                                                    {associationSummary.expiringRows.map(({ partner, status }) => (
                                                        <div key={partner._id} className="d-flex justify-content-between gap-2 flex-wrap">
                                                            <span>{partner.name}</span>
                                                            <span className="text-muted">
                                                                {status.label} · {formatDateIT(partner.associationExpiresAt)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}

                                        {associationSummary.expiredRows.length ? (
                                            <div>
                                                <div className="fw-semibold mb-2 text-danger">Scaduti</div>

                                                <div className="d-grid gap-2">
                                                    {associationSummary.expiredRows.map(({ partner, status }) => (
                                                        <div key={partner._id} className="d-flex justify-content-between gap-2 flex-wrap">
                                                            <span>{partner.name}</span>
                                                            <span className="text-muted">
                                                                {status.label} · {formatDateIT(partner.associationExpiresAt)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="alert alert-success py-2 mb-0">
                                        Nessuna agevolazione partner in scadenza o scaduta.
                                    </div>
                                )}
                            </div>

                            <h5 className="mb-3">Partner salvati</h5>

                            {error ? (
                                <div className="alert alert-danger py-2" role="alert">
                                    {error}
                                </div>
                            ) : null}

                            {loading ? (
                                <div className="text-muted">Carico partner...</div>
                            ) : partners.length === 0 ? (
                                <div className="text-muted">Nessun partner salvato.</div>
                            ) : (
                                <div className="list-group admin-partners-list">
                                    {partners.map((partner) => (
                                        <div key={partner._id} className="list-group-item admin-partners-item">
                                            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="fw-semibold d-flex align-items-center gap-2 flex-wrap">
                                                        <span>{partner.name}</span>

                                                        {!partner.isActive ? (
                                                            <span className="badge text-bg-secondary">Partner nascosto</span>
                                                        ) : (
                                                            <span className="badge text-bg-primary">Partner visibile</span>
                                                        )}

                                                        {partner.partnerCouponCode ? (
                                                            <>
                                                                <span className="badge text-bg-warning">
                                                                    Coupon: {partner.partnerCouponCode}
                                                                </span>

                                                                <span className={`badge ${partner.partnerCouponEnabled ? "text-bg-success" : "text-bg-secondary"}`}>
                                                                    Codice {partner.partnerCouponEnabled ? "abilitato" : "disabilitato"}
                                                                </span>
                                                            </>
                                                        ) : null}

                                                        <span className={`badge ${getPartnerAssociationStatus(partner).badgeClass}`}>
                                                            Agevolazione: {getPartnerAssociationStatus(partner).label}
                                                        </span>

                                                    </div>

                                                    <div className="text-muted" style={{ fontSize: 13 }}>
                                                        /partners/{partner.slug}
                                                    </div>

                                                    {partner.contactPersonName ? (
                                                        <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                                                            Referente: {partner.contactPersonName}
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-2" style={{ fontSize: 14 }}>
                                                        {partner.city} ({partner.province}) · {partner.region}
                                                    </div>

                                                    <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                                                        Ordine: {partner.sortOrder ?? 0}
                                                    </div>

                                                    <div className="d-flex flex-wrap gap-3 mt-2 text-muted" style={{ fontSize: 13 }}>
                                                        {partner.phone ? <span>Tel: {partner.phone}</span> : null}
                                                        {partner.email ? <span>Email: {partner.email}</span> : null}
                                                        {partner.website ? (
                                                            <a href={partner.website} target="_blank" rel="noreferrer">
                                                                Sito web
                                                            </a>
                                                        ) : null}
                                                        {partner.instagram ? (
                                                            <a href={partner.instagram} target="_blank" rel="noreferrer">
                                                                Instagram negozio
                                                            </a>
                                                        ) : null}

                                                        {partner.personalInstagram ? (
                                                            <a href={partner.personalInstagram} target="_blank" rel="noreferrer">
                                                                Instagram personale
                                                            </a>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="d-flex gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning btn-sm fw-semibold"
                                                        onClick={() => togglePartnerDetails(partner._id)}
                                                    >
                                                        {expandedPartnerId === String(partner._id) ? "Chiudi dettagli ▲" : "Dettagli ▼"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => startEdit(partner)}
                                                    >
                                                        Modifica
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleDelete(partner._id)}
                                                    >
                                                        Elimina
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedPartnerId === String(partner._id) ? (
                                                <div className="mt-3 pt-3 border-top border-secondary-subtle">
                                                    <div className="row g-3">
                                                        <div className="col-12 col-lg-7">
                                                            <div className="row g-2" style={{ fontSize: 14 }}>
                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Referente</div>
                                                                    <div>{partner.contactPersonName || "—"}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="text-muted">Indirizzo</div>
                                                                    <div>
                                                                        {[
                                                                            partner.address,
                                                                            partner.cap,
                                                                            partner.city,
                                                                            partner.province,
                                                                            partner.region,
                                                                        ]
                                                                            .filter(Boolean)
                                                                            .join(" · ") || "—"}
                                                                    </div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Latitudine</div>
                                                                    <div>{partner.lat ?? "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Longitudine</div>
                                                                    <div>{partner.lng ?? "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Telefono</div>
                                                                    <div>{partner.phone || "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Email</div>
                                                                    <div>{partner.email || "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Sito web</div>
                                                                    {partner.website ? (
                                                                        <a href={partner.website} target="_blank" rel="noreferrer">
                                                                            {partner.website}
                                                                        </a>
                                                                    ) : (
                                                                        <div>—</div>
                                                                    )}
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Instagram negozio</div>
                                                                    {partner.instagram ? (
                                                                        <a href={partner.instagram} target="_blank" rel="noreferrer">
                                                                            {partner.instagram}
                                                                        </a>
                                                                    ) : (
                                                                        <div>—</div>
                                                                    )}
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Instagram personale</div>
                                                                    {partner.personalInstagram ? (
                                                                        <a href={partner.personalInstagram} target="_blank" rel="noreferrer">
                                                                            {partner.personalInstagram}
                                                                        </a>
                                                                    ) : (
                                                                        <div>—</div>
                                                                    )}
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Coupon partner</div>
                                                                    <div>{partner.partnerCouponCode || "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Ordine visualizzazione</div>
                                                                    <div>{partner.sortOrder ?? 0}</div>
                                                                </div>
                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Agevolazione partner</div>
                                                                    <div>{getPartnerAssociationStatus(partner).label}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Scadenza agevolazione</div>
                                                                    <div>{formatDateIT(partner.associationExpiresAt)}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Ordine attivazione/rinnovo</div>
                                                                    <div>{partner.associationLastOrderPublicId || "—"}</div>
                                                                </div>

                                                                <div className="col-12 col-md-6">
                                                                    <div className="text-muted">Data attivazione/rinnovo</div>
                                                                    <div>{formatDateIT(partner.associationLastOrderAt)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="col-12 col-lg-5">
                                                            {partner.image ? (
                                                                <div>
                                                                    <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                                                                        Immagine principale
                                                                    </div>
                                                                    <img
                                                                        src={partner.image}
                                                                        alt={partner.name || "Partner"}
                                                                        style={{
                                                                            width: "100%",
                                                                            maxHeight: 180,
                                                                            objectFit: "cover",
                                                                            borderRadius: 12,
                                                                            border: "1px solid rgba(255,255,255,.12)",
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                                    Nessuna immagine principale.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                                                                Servizi
                                                            </div>

                                                            {Array.isArray(partner.services) && partner.services.length ? (
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {partner.services.map((service) => (
                                                                        <span key={service} className="badge text-bg-dark">
                                                                            {service}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted" style={{ fontSize: 13 }}>—</div>
                                                            )}
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                                                                Trattamenti
                                                            </div>

                                                            {Array.isArray(partner.treatments) && partner.treatments.length ? (
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {partner.treatments.map((treatment) => (
                                                                        <span key={treatment} className="badge text-bg-secondary">
                                                                            {treatment}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted" style={{ fontSize: 13 }}>—</div>
                                                            )}
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                                                                Descrizione
                                                            </div>
                                                            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>
                                                                {partner.description || "—"}
                                                            </div>
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                                                                Gallery
                                                            </div>

                                                            {Array.isArray(partner.gallery) && partner.gallery.length ? (
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {partner.gallery.map((imgUrl) => (
                                                                        <a
                                                                            key={imgUrl}
                                                                            href={imgUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            title={imgUrl}
                                                                        >
                                                                            <img
                                                                                src={imgUrl}
                                                                                alt="Gallery partner"
                                                                                style={{
                                                                                    width: 74,
                                                                                    height: 74,
                                                                                    objectFit: "cover",
                                                                                    borderRadius: 10,
                                                                                    border: "1px solid rgba(255,255,255,.12)",
                                                                                }}
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                                    Nessuna immagine gallery.
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="mt-3 pt-3 border-top border-secondary-subtle">
                                                                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
                                                                    <div>
                                                                        <h6 className="mb-1">Ordini partner</h6>
                                                                        <div className="text-muted" style={{ fontSize: 13 }}>
                                                                            Ordini effettuati con codice partner o collegati a questo partner.
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-light"
                                                                        onClick={() => loadPartnerOrders(partner._id)}
                                                                        disabled={!!partnerOrdersLoadingById[String(partner._id)]}
                                                                    >
                                                                        {partnerOrdersLoadingById[String(partner._id)] ? "Aggiorno..." : "Aggiorna ordini"}
                                                                    </button>
                                                                </div>

                                                                {(() => {
                                                                    const partnerId = String(partner._id || "");
                                                                    const data = partnerOrdersById[partnerId] || null;
                                                                    const loadingOrders = !!partnerOrdersLoadingById[partnerId];
                                                                    const ordersError = partnerOrdersErrorById[partnerId] || "";

                                                                    if (loadingOrders && !data) {
                                                                        return (
                                                                            <div className="text-muted" style={{ fontSize: 14 }}>
                                                                                Carico ordini partner...
                                                                            </div>
                                                                        );
                                                                    }

                                                                    if (ordersError) {
                                                                        return (
                                                                            <div className="alert alert-danger py-2 mb-0" role="alert">
                                                                                {ordersError}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    if (!data) {
                                                                        return (
                                                                            <div className="text-muted" style={{ fontSize: 14 }}>
                                                                                Nessun dato ordine caricato.
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const summary = data.summary || {};
                                                                    const orders = Array.isArray(data.orders) ? data.orders : [];

                                                                    return (
                                                                        <>
                                                                            <div className="row g-2 mb-3">
                                                                                <div className="col-6 col-lg-3">
                                                                                    <div className="alert alert-secondary py-2 px-3 mb-0">
                                                                                        <div className="fw-semibold">
                                                                                            {Number(summary.ordersCount) || 0}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 13 }}>Ordini validi</div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-6 col-lg-3">
                                                                                    <div className="alert alert-secondary py-2 px-3 mb-0">
                                                                                        <div className="fw-semibold">
                                                                                            {Number(summary.piecesCount) || 0}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 13 }}>Pezzi acquistati</div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-6 col-lg-3">
                                                                                    <div className="alert alert-success py-2 px-3 mb-0">
                                                                                        <div className="fw-semibold">
                                                                                            {formatMoneyCents(summary.spentCents)}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 13 }}>Totale speso</div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-6 col-lg-3">
                                                                                    <div className="alert alert-secondary py-2 px-3 mb-0">
                                                                                        <div className="fw-semibold">
                                                                                            {formatDateIT(summary.lastOrderAt)}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 13 }}>Ultimo ordine</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {orders.length === 0 ? (
                                                                                <div className="text-muted" style={{ fontSize: 14 }}>
                                                                                    Nessun ordine trovato per questo partner.
                                                                                </div>
                                                                            ) : (
                                                                                <div className="d-grid gap-3">
                                                                                    {orders.map((order) => (
                                                                                        <div
                                                                                            key={order._id}
                                                                                            className="border rounded-3 p-3"
                                                                                            style={{ borderColor: "rgba(255,255,255,.12)" }}
                                                                                        >
                                                                                            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
                                                                                                <div>
                                                                                                    <div className="fw-semibold">
                                                                                                        Ordine {order.publicId || order._id}
                                                                                                    </div>

                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>
                                                                                                        {formatDateIT(order.createdAt)}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="d-flex gap-2 flex-wrap">
                                                                                                    <span className={`badge ${getOrderStatusBadgeClass(order.status)}`}>
                                                                                                        {formatOrderStatus(order.status)}
                                                                                                    </span>

                                                                                                    {order.isValidSpentStatus ? (
                                                                                                        <span className="badge text-bg-success">
                                                                                                            Conteggiato nella spesa
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="badge text-bg-secondary">
                                                                                                            Non conteggiato
                                                                                                        </span>
                                                                                                    )}

                                                                                                    {order.partnerActivationEligible ? (
                                                                                                        <span className="badge text-bg-warning">
                                                                                                            Attiva/rinnova collaborazione
                                                                                                        </span>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="row g-2 mb-3">
                                                                                                <div className="col-6 col-lg-3">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Pezzi</div>
                                                                                                    <div className="fw-semibold">{Number(order.piecesCount) || 0}</div>
                                                                                                </div>

                                                                                                <div className="col-6 col-lg-3">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Subtotale</div>
                                                                                                    <div className="fw-semibold">{formatMoneyCents(order.subtotalCents)}</div>
                                                                                                </div>

                                                                                                <div className="col-6 col-lg-3">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Sconto</div>
                                                                                                    <div className="fw-semibold">-{formatMoneyCents(order.discountCents)}</div>
                                                                                                </div>

                                                                                                <div className="col-6 col-lg-3">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Totale</div>
                                                                                                    <div className="fw-semibold">{formatMoneyCents(order.totalCents)}</div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="row g-2 mb-3">
                                                                                                <div className="col-12 col-md-6">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Coupon partner usato</div>
                                                                                                    <div>{order.partnerCouponCodeApplied || "—"}</div>
                                                                                                </div>

                                                                                                <div className="col-12 col-md-6">
                                                                                                    <div className="text-muted" style={{ fontSize: 13 }}>Pagamento</div>
                                                                                                    <div>
                                                                                                        {order.paymentMethodLabel ||
                                                                                                            order.paymentMethodType ||
                                                                                                            order.paymentProvider ||
                                                                                                            "—"}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            {Array.isArray(order.items) && order.items.length ? (
                                                                                                <div className="table-responsive">
                                                                                                    <table className="table table-sm table-dark table-striped align-middle mb-0">
                                                                                                        <thead>
                                                                                                            <tr>
                                                                                                                <th>Prodotto</th>
                                                                                                                <th className="text-end">Q.tà</th>
                                                                                                                <th className="text-end">Prezzo</th>
                                                                                                                <th className="text-end">Totale riga</th>
                                                                                                            </tr>
                                                                                                        </thead>

                                                                                                        <tbody>
                                                                                                            {order.items.map((item, index) => (
                                                                                                                <tr key={`${order._id}-${item.productId}-${index}`}>
                                                                                                                    <td>{item.name || item.productId || "Prodotto"}</td>
                                                                                                                    <td className="text-end">{Number(item.qty) || 0}</td>
                                                                                                                    <td className="text-end">{formatMoneyCents(item.unitPriceCents)}</td>
                                                                                                                    <td className="text-end">{formatMoneyCents(item.lineTotalCents)}</td>
                                                                                                                </tr>
                                                                                                            ))}
                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                                                                    Nessun dettaglio prodotto disponibile.
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}