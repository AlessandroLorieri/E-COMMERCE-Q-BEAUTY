import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

function formatEURFromCents(cents) {
    const value = (Number(cents || 0) / 100) || 0;
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function eurosToCents(eurString) {
    const raw = String(eurString ?? "").trim().replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
}

function normalizeUrlLines(text) {
    const lines = String(text ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    const seen = new Set();
    const out = [];
    for (const l of lines) {
        if (!seen.has(l)) {
            seen.add(l);
            out.push(l);
        }
    }
    return out;
}

function isValidHttpUrlString(s) {
    try {
        const u = new URL(String(s).trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

export default function AdminProducts() {
    const apiBase = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState("");

    const [mode, setMode] = useState("create");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        productId: "",
        name: "",
        priceEur: "",
        compareAtPriceEur: "",
        stockQty: "0",
        sortOrder: "9999",
        isActive: true,

        imageUrl: "",
        galleryImageUrlsText: "",
        shortDesc: "",
        description: "",
        howToText: "",
        ingredientsText: "",

        badgeEnabled: false,
        badgePrivateText: "",
        badgePivaText: "",
        badgeBgColor: "",
        badgeTextColor: "",
    });

    const [formErrors, setFormErrors] = useState({});

    const canGoPrev = page > 1;
    const canGoNext = page < pages;

    const queryString = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", String(limit));
        if (q.trim()) sp.set("q", q.trim());
        return sp.toString();
    }, [page, limit, q]);

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
            const next = encodeURIComponent("/admin/products");
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

    async function loadProducts() {
        setErrMsg("");
        setLoading(true);
        try {
            const data = await apiFetch(`/api/products/admin?${queryString}`, { method: "GET" });
            setProducts(data.products || []);
            setPage(data.page || 1);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento prodotti");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProducts();
    }, [queryString]);

    function resetForm() {
        setMode("create");
        setEditingId(null);
        setForm({
            productId: "",
            name: "",
            priceEur: "",
            compareAtPriceEur: "",
            stockQty: "0",
            sortOrder: "9999",
            isActive: true,

            imageUrl: "",
            galleryImageUrlsText: "",
            shortDesc: "",
            description: "",
            howToText: "",
            ingredientsText: "",

            badgeEnabled: false,
            badgePrivateText: "",
            badgePivaText: "",
            badgeBgColor: "",
            badgeTextColor: "",
        });

        setFormErrors({});
    }

    function startEdit(p) {
        setMode("edit");
        setEditingId(p.productId || p._id);
        setForm({
            productId: p.productId || "",
            name: p.name || "",
            priceEur: String(((Number(p.priceCents || 0) / 100) || 0).toFixed(2)).replace(".", ","),
            compareAtPriceEur:
                p.compareAtPriceCents == null
                    ? ""
                    : String(((Number(p.compareAtPriceCents || 0) / 100) || 0).toFixed(2)).replace(".", ","),
            stockQty: String(p.stockQty ?? 0),
            sortOrder: String(p.sortOrder ?? 9999),
            isActive: !!p.isActive,

            imageUrl: p.imageUrl || "",
            galleryImageUrlsText: Array.isArray(p.galleryImageUrls) ? p.galleryImageUrls.join("\n") : "",
            shortDesc: p.shortDesc || "",
            description: p.description || "",
            howToText: Array.isArray(p.howTo) ? p.howTo.join("\n") : "",
            ingredientsText: Array.isArray(p.ingredients) ? p.ingredients.join("\n") : "",

            badgeEnabled: !!p?.badge?.enabled,
            badgePrivateText: p?.badge?.privateText || "",
            badgePivaText: p?.badge?.pivaText || "",
            badgeBgColor: p?.badge?.bgColor || "",
            badgeTextColor: p?.badge?.textColor || "",
        });

        setFormErrors({});
        setErrMsg("");
    }

    function validateForm() {
        const errors = {};

        const stock = Number(String(form.stockQty ?? "").trim());
        if (!Number.isFinite(stock) || stock < 0) errors.stockQty = "Stock non valido";

        const sortOrder = Number(String(form.sortOrder ?? "").trim());
        if (!Number.isFinite(sortOrder) || sortOrder < 0) errors.sortOrder = "Ordine non valido";

        if (mode === "create") {
            if (!String(form.productId || "").trim()) errors.productId = "productId richiesto";
        }

        if (!String(form.name || "").trim()) errors.name = "Nome richiesto";

        const priceCents = eurosToCents(form.priceEur);
        if (priceCents === null) errors.priceEur = "Prezzo non valido";

        const compareRaw = String(form.compareAtPriceEur ?? "").trim();
        let compareAtPriceCents = undefined;
        let compareAtClear = false;          

        if (compareRaw) {
            const v = eurosToCents(compareRaw);
            if (v === null) errors.compareAtPriceEur = "Prezzo originale non valido";
            else if (priceCents !== null && v < priceCents) errors.compareAtPriceEur = "Deve essere >= del prezzo finale";
            else compareAtPriceCents = v;
        } else {
            compareAtClear = true;
        }

        if (String(form.imageUrl || "").trim()) {
            try {
                new URL(String(form.imageUrl).trim());
            } catch {
                errors.imageUrl = "URL immagine non valido";
            }
        }

        const galleryUrls = normalizeUrlLines(form.galleryImageUrlsText);

        if (galleryUrls.some((u) => !isValidHttpUrlString(u))) {
            errors.galleryImageUrlsText = "Uno o più URL della gallery non sono validi (http/https)";
        }

        setFormErrors(errors);

        return {
            ok: Object.keys(errors).length === 0,
            priceCents,
            compareAtPriceCents,
            compareAtClear,
            stockQty: Math.trunc(stock),
            sortOrder: Math.trunc(sortOrder),
            galleryUrls,
        };
    }


    async function handleCreateOrUpdate(e) {
        e.preventDefault();
        setErrMsg("");

        const { ok, priceCents, compareAtPriceCents, compareAtClear, stockQty, sortOrder, galleryUrls } = validateForm();
        if (!ok) return;

        const howTo = String(form.howToText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        const ingredients = String(form.ingredientsText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        const badgePayloadForUpdate = {
            enabled: !!form.badgeEnabled,
            privateText: String(form.badgePrivateText || "").trim() || null,
            pivaText: String(form.badgePivaText || "").trim() || null,
            bgColor: String(form.badgeBgColor || "").trim() || null,
            textColor: String(form.badgeTextColor || "").trim() || null,
        };

        const shouldSendBadgeOnCreate =
            badgePayloadForUpdate.enabled ||
            badgePayloadForUpdate.privateText ||
            badgePayloadForUpdate.pivaText ||
            badgePayloadForUpdate.bgColor ||
            badgePayloadForUpdate.textColor;

        const badgePayloadForCreate = shouldSendBadgeOnCreate ? badgePayloadForUpdate : undefined;

        setLoading(true);
        try {
            if (mode === "create") {
                await apiFetch(`/api/products`, {
                    method: "POST",
                    body: JSON.stringify({
                        productId: String(form.productId).trim(),
                        name: String(form.name).trim(),
                        priceCents,

                        ...(compareAtPriceCents !== undefined ? { compareAtPriceCents } : {}),

                        stockQty,
                        sortOrder,
                        isActive: !!form.isActive,

                        imageUrl: String(form.imageUrl || "").trim() || undefined,
                        galleryImageUrls: galleryUrls.length ? galleryUrls : undefined,
                        shortDesc: String(form.shortDesc || "").trim() || undefined,
                        description: String(form.description || "").trim() || undefined,
                        howTo,
                        ingredients,
                        badge: badgePayloadForCreate,
                    }),

                });
            } else {
                await apiFetch(`/api/products/${encodeURIComponent(editingId)}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        name: String(form.name).trim(),
                        priceCents,
                        compareAtPriceCents: compareAtClear ? null : compareAtPriceCents,
                        stockQty,
                        sortOrder,
                        isActive: !!form.isActive,

                        imageUrl: String(form.imageUrl || "").trim() || null,
                        galleryImageUrls: galleryUrls.length ? galleryUrls : null,
                        shortDesc: String(form.shortDesc || "").trim() || null,
                        description: String(form.description || "").trim() || null,
                        howTo,
                        ingredients,
                        badge: badgePayloadForUpdate,
                    }),

                });
            }

            resetForm();
            await loadProducts();
        } catch (e2) {
            const payloadErrors = e2?.payload?.errors;
            if (payloadErrors && typeof payloadErrors === "object") {
                const mapped = {};
                if (payloadErrors.productId) mapped.productId = payloadErrors.productId;
                if (payloadErrors.name) mapped.name = payloadErrors.name;
                if (payloadErrors.priceCents) mapped.priceEur = payloadErrors.priceCents;
                if (payloadErrors.stockQty) mapped.stockQty = payloadErrors.stockQty;
                if (payloadErrors.sortOrder) mapped.sortOrder = payloadErrors.sortOrder;
                if (payloadErrors.imageUrl) mapped.imageUrl = payloadErrors.imageUrl;
                if (payloadErrors.galleryImageUrls) mapped.galleryImageUrlsText = payloadErrors.galleryImageUrls;
                if (payloadErrors.howTo) mapped.howToText = payloadErrors.howTo;
                if (payloadErrors.ingredients) mapped.ingredientsText = payloadErrors.ingredients;
                if (payloadErrors.compareAtPriceCents) mapped.compareAtPriceEur = payloadErrors.compareAtPriceCents;
                if (payloadErrors.badge) mapped.badge = payloadErrors.badge;
                setFormErrors((prev) => ({ ...prev, ...mapped }));
            }
            setErrMsg(e2.message || "Errore salvataggio");
        } finally {
            setLoading(false);
        }
    }

    async function deactivate(p) {
        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/products/${encodeURIComponent(p.productId || p._id)}`, {
                method: "DELETE",
            });
            await loadProducts();
        } catch (e) {
            setErrMsg(e.message || "Errore disattivazione");
        } finally {
            setLoading(false);
        }
    }

    async function activate(p) {
        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/products/${encodeURIComponent(p.productId || p._id)}`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: true }),
            });
            await loadProducts();
        } catch (e) {
            setErrMsg(e.message || "Errore attivazione");
        } finally {
            setLoading(false);
        }
    }

    async function hardDelete(p) {
        const id = p.productId || p._id;

        const ok = window.confirm(
            `Eliminare DEFINITIVAMENTE questo prodotto?\n\n${p.productId} - ${p.name}\n\nAzione irreversibile.`
        );
        if (!ok) return;

        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/products/${encodeURIComponent(id)}/hard`, {
                method: "DELETE",
            });
            await loadProducts();
            resetForm();
        } catch (e) {
            setErrMsg(e.message || "Errore eliminazione definitiva");
        } finally {
            setLoading(false);
        }
    }


    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Prodotti</h3>
                <div className="text-muted">
                    Totale: <b>{total}</b>
                </div>
            </div>

            {errMsg ? (
                <div className="alert alert-danger">{errMsg}</div>
            ) : null}

            {/* Search + pagination */}
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    className="form-control"
                    style={{ maxWidth: 320 }}
                    placeholder="Cerca per nome o productId..."
                    value={q}
                    onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                    }}
                />

                <div className="ms-auto d-flex gap-2 align-items-center">
                    <button
                        className="btn btn-outline-secondary"
                        disabled={loading || !canGoPrev}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>

                    <div className="text-muted">
                        Pagina <b>{page}</b> / {pages}
                    </div>

                    <button
                        className="btn btn-outline-secondary"
                        disabled={loading || !canGoNext}
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Form create/edit */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h5 className="m-0">
                            {mode === "create" ? "Crea prodotto" : `Modifica prodotto: ${form.productId}`}
                        </h5>
                        {mode === "edit" ? (
                            <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                                Annulla modifica
                            </button>
                        ) : null}
                    </div>

                    <form onSubmit={handleCreateOrUpdate} className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">productId</label>
                            <input
                                className={`form-control ${formErrors.productId ? "is-invalid" : ""}`}
                                value={form.productId}
                                disabled={mode === "edit"}
                                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                            />
                            {formErrors.productId ? <div className="invalid-feedback">{formErrors.productId}</div> : null}
                            {mode === "edit" ? (
                                <div className="form-text">Non modificabile.</div>
                            ) : null}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Nome</label>
                            <input
                                className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                            {formErrors.name ? <div className="invalid-feedback">{formErrors.name}</div> : null}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Stock</label>
                            <input
                                type="number"
                                min={0}
                                className={`form-control ${formErrors.stockQty ? "is-invalid" : ""}`}
                                value={form.stockQty}
                                onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                            />
                            {formErrors.stockQty ? (
                                <div className="invalid-feedback">{formErrors.stockQty}</div>
                            ) : null}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Ordine (sortOrder)</label>
                            <input
                                type="number"
                                min={0}
                                className={`form-control ${formErrors.sortOrder ? "is-invalid" : ""}`}
                                value={form.sortOrder}
                                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                            />
                            {formErrors.sortOrder ? <div className="invalid-feedback">{formErrors.sortOrder}</div> : null}
                            <div className="form-text">Numero più basso = più in alto in Home.</div>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Prezzo (EUR)</label>
                            <input
                                className={`form-control ${formErrors.priceEur ? "is-invalid" : ""}`}
                                placeholder="es. 12,90"
                                value={form.priceEur}
                                onChange={(e) => setForm((f) => ({ ...f, priceEur: e.target.value }))}
                            />
                            {formErrors.priceEur ? <div className="invalid-feedback">{formErrors.priceEur}</div> : null}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Prezzo originale (EUR)</label>
                            <input
                                className={`form-control ${formErrors.compareAtPriceEur ? "is-invalid" : ""}`}
                                placeholder="es. 79,90"
                                value={form.compareAtPriceEur}
                                onChange={(e) => setForm((f) => ({ ...f, compareAtPriceEur: e.target.value }))}
                            />
                            {formErrors.compareAtPriceEur ? (
                                <div className="invalid-feedback">{formErrors.compareAtPriceEur}</div>
                            ) : null}
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Immagine (URL)</label>
                            <input
                                className={`form-control ${formErrors.imageUrl ? "is-invalid" : ""}`}
                                placeholder="https://..."
                                value={form.imageUrl}
                                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                            />
                            {formErrors.imageUrl ? <div className="invalid-feedback">{formErrors.imageUrl}</div> : null}
                        </div>

                        <div className="col-12">
                            <label className="form-label">Gallery immagini dettaglio (una riga = un URL)</label>
                            <textarea
                                className={`form-control ${formErrors.galleryImageUrlsText ? "is-invalid" : ""}`}
                                rows={4}
                                placeholder={"https://...\nhttps://...\nhttps://..."}
                                value={form.galleryImageUrlsText}
                                onChange={(e) => setForm((f) => ({ ...f, galleryImageUrlsText: e.target.value }))}
                            />
                            {formErrors.galleryImageUrlsText ? (
                                <div className="invalid-feedback">{formErrors.galleryImageUrlsText}</div>
                            ) : (
                                <div className="form-text">Queste immagini verranno usate nel carosello della pagina dettaglio prodotto.</div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Short description</label>
                            <input
                                className="form-control"
                                value={form.shortDesc}
                                onChange={(e) => setForm((f) => ({ ...f, shortDesc: e.target.value }))}
                            />
                        </div>

                        <div className="col-12">
                            <label className="form-label">Descrizione</label>
                            <textarea
                                className="form-control"
                                rows={4}
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Come si usa (una riga = uno step)</label>
                            <textarea
                                className="form-control"
                                rows={5}
                                value={form.howToText}
                                onChange={(e) => setForm((f) => ({ ...f, howToText: e.target.value }))}
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Ingredienti (una riga = un ingrediente)</label>
                            <textarea
                                className="form-control"
                                rows={5}
                                value={form.ingredientsText}
                                onChange={(e) => setForm((f) => ({ ...f, ingredientsText: e.target.value }))}
                            />
                        </div>

                        <div className="col-12">
                            <hr className="my-2" />
                            <h6 className="m-0">Badge promo (card prodotto)</h6>
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                Se disabilitato o testo vuoto per il tipo utente, il badge non verrà mostrato.
                            </div>
                            {formErrors.badge ? (
                                <div className="alert alert-danger mt-2 mb-0">{formErrors.badge}</div>
                            ) : null}
                        </div>

                        <div className="col-md-2 d-flex align-items-end">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!!form.badgeEnabled}
                                    onChange={(e) => setForm((f) => ({ ...f, badgeEnabled: e.target.checked }))}
                                    id="badgeEnabled"
                                />
                                <label className="form-check-label" htmlFor="badgeEnabled">
                                    Abilitato
                                </label>
                            </div>
                        </div>

                        <div className="col-md-5">
                            <label className="form-label">Testo PRIVATO / guest</label>
                            <input
                                className="form-control"
                                placeholder="es. -10% OGGI"
                                value={form.badgePrivateText}
                                onChange={(e) => setForm((f) => ({ ...f, badgePrivateText: e.target.value }))}
                            />
                        </div>

                        <div className="col-md-5">
                            <label className="form-label">Testo P.IVA</label>
                            <input
                                className="form-control"
                                placeholder="es. SCONTO RIVENDITORI"
                                value={form.badgePivaText}
                                onChange={(e) => setForm((f) => ({ ...f, badgePivaText: e.target.value }))}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Badge BG (opzionale)</label>
                            <input
                                className="form-control"
                                placeholder="es. #ff2d2d"
                                value={form.badgeBgColor}
                                onChange={(e) => setForm((f) => ({ ...f, badgeBgColor: e.target.value }))}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Badge Text (opzionale)</label>
                            <input
                                className="form-control"
                                placeholder="es. #ffffff"
                                value={form.badgeTextColor}
                                onChange={(e) => setForm((f) => ({ ...f, badgeTextColor: e.target.value }))}
                            />
                        </div>



                        <div className="col-md-2 d-flex align-items-end">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!!form.isActive}
                                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                                    id="isActive"
                                />
                                <label className="form-check-label" htmlFor="isActive">
                                    Attivo
                                </label>
                            </div>
                        </div>

                        <div className="col-12 d-flex gap-2">
                            <button className="btn btn-primary" disabled={loading}>
                                {mode === "create" ? "Crea" : "Salva"}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={resetForm}>
                                Reset
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th>productId</th>
                            <th>Nome</th>
                            <th>Prezzo</th>
                            <th>Ordine</th>
                            <th>Attivo</th>
                            <th style={{ width: 220 }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p._id || p.productId}>
                                <td><code>{p.productId}</code></td>
                                <td>{p.name}</td>
                                <td>{formatEURFromCents(p.priceCents)}</td>
                                <td><code>{p.sortOrder ?? 9999}</code></td>
                                <td>{p.isActive ? "✅" : "⛔️"}</td>
                                <td className="d-flex gap-2">
                                    <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(p)} disabled={loading}>
                                        Modifica
                                    </button>

                                    {p.isActive ? (
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deactivate(p)} disabled={loading}>
                                            Disattiva
                                        </button>
                                    ) : (
                                        <button className="btn btn-sm btn-outline-success" onClick={() => activate(p)} disabled={loading}>
                                            Attiva
                                        </button>
                                    )}
                                    {!p.isActive ? (
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => hardDelete(p)}
                                            disabled={loading}
                                        >
                                            Elimina
                                        </button>
                                    ) : null}

                                </td>
                            </tr>
                        ))}

                        {!loading && products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-muted py-4">
                                    Nessun prodotto trovato.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {loading ? <div className="text-muted mt-3">Caricamento...</div> : null}
        </div>
    );
}
