import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

function eurosToCents(eurString) {
    const raw = String(eurString ?? "").trim().replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
}

function centsToEurString(cents) {
    return String(((Number(cents || 0) / 100) || 0).toFixed(2)).replace(".", ",");
}

export default function AdminCoupons() {
    const apiBase = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [coupons, setCoupons] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState("");

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsErr, setProductsErr] = useState("");

    const [mode, setMode] = useState("create");
    const [editingId, setEditingId] = useState(null);

    const [rulesMixedWarning, setRulesMixedWarning] = useState("");

    const [form, setForm] = useState({
        code: "",
        name: "",
        isActive: true,
        startsAt: "",
        endsAt: "",

        discountType: "percent", 
        discountValue: "10",     

        selectedProductIds: [],  
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
            const next = encodeURIComponent("/admin/coupons");
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

    async function loadCoupons() {
        setErrMsg("");
        setLoading(true);
        try {
            const data = await apiFetch(`/api/coupons/admin?${queryString}`, { method: "GET" });
            setCoupons(data.coupons || []);
            setPage(data.page || 1);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento coupons");
        } finally {
            setLoading(false);
        }
    }

    async function loadProducts() {
        setProductsErr("");
        setProductsLoading(true);
        try {
            const data = await apiFetch(`/api/products/admin?page=1&limit=500`, { method: "GET" });
            setProducts(data.products || []);
        } catch (e) {
            setProducts([]);
            setProductsErr(e.message || "Errore caricamento prodotti");
        } finally {
            setProductsLoading(false);
        }
    }

    useEffect(() => {
        loadCoupons();
    }, [queryString]);

    useEffect(() => {
        loadProducts();
    }, []);

    const selectedSet = useMemo(() => new Set(form.selectedProductIds || []), [form.selectedProductIds]);
    const selectedCount = (form.selectedProductIds || []).length;

    function resetForm() {
        setMode("create");
        setEditingId(null);
        setRulesMixedWarning("");
        setForm({
            code: "",
            name: "",
            isActive: true,
            startsAt: "",
            endsAt: "",
            discountType: "percent",
            discountValue: "10",
            selectedProductIds: [],
        });
        setFormErrors({});
        setErrMsg("");
    }

    function startEdit(c) {
        setMode("edit");
        setEditingId(c._id);
        setRulesMixedWarning("");

        const startsAt = c.startsAt ? String(c.startsAt).slice(0, 16) : "";
        const endsAt = c.endsAt ? String(c.endsAt).slice(0, 16) : "";

        const rules = Array.isArray(c.rules) ? c.rules : [];
        const selectedProductIds = rules.map((r) => String(r.productId || "").trim()).filter(Boolean);

        let discountType = "percent";
        let discountValue = "10";

        if (rules.length) {
            const firstType = String(rules[0].type || "percent");
            const firstValue = rules[0].value;

            const allSame = rules.every((r) => String(r.type || "") === firstType && r.value === firstValue);

            discountType = firstType === "fixed" ? "fixed" : "percent";
            discountValue = discountType === "fixed" ? centsToEurString(firstValue) : String(firstValue ?? "");

            if (!allSame) {
                setRulesMixedWarning(
                    "⚠️ Questo coupon aveva regole con valori diversi tra prodotti. Salvando, verranno uniformate col valore impostato qui."
                );
            }
        }

        setForm({
            code: c.code || "",
            name: c.name || "",
            isActive: !!c.isActive,
            startsAt,
            endsAt,
            discountType,
            discountValue,
            selectedProductIds,
        });

        setFormErrors({});
        setErrMsg("");
    }

    function toggleProduct(pid, enabled) {
        const productId = String(pid || "").trim();
        if (!productId) return;

        setForm((f) => {
            const cur = Array.isArray(f.selectedProductIds) ? f.selectedProductIds : [];
            const exists = cur.includes(productId);

            if (enabled && !exists) return { ...f, selectedProductIds: [...cur, productId] };
            if (!enabled && exists) return { ...f, selectedProductIds: cur.filter((x) => x !== productId) };
            return f;
        });
    }

    function validateForm() {
        const errors = {};

        const code = String(form.code || "").trim().toUpperCase();
        if (!code) errors.code = "Codice richiesto";
        else if (!/^[A-Z0-9_-]{3,32}$/.test(code)) errors.code = "3-32, solo A-Z/0-9/_/-";

        const startsAtRaw = String(form.startsAt || "").trim();
        const endsAtRaw = String(form.endsAt || "").trim();

        if (startsAtRaw && Number.isNaN(new Date(startsAtRaw).getTime())) errors.startsAt = "Data inizio non valida";
        if (endsAtRaw && Number.isNaN(new Date(endsAtRaw).getTime())) errors.endsAt = "Data fine non valida";
        if (startsAtRaw && endsAtRaw && new Date(endsAtRaw).getTime() < new Date(startsAtRaw).getTime()) {
            errors.endsAt = "Deve essere >= startsAt";
        }

        const discountType = String(form.discountType || "").trim();
        if (discountType !== "percent" && discountType !== "fixed") errors.discountType = "Tipo non valido";

        const valRaw = String(form.discountValue ?? "").trim();
        if (!valRaw) errors.discountValue = "Valore richiesto";

        let parsedValue = null;

        if (!errors.discountType && !errors.discountValue) {
            if (discountType === "percent") {
                const n = Number(valRaw.replace(",", "."));
                if (!Number.isFinite(n) || n <= 0 || n > 100) errors.discountValue = "1..100";
                else parsedValue = n;
            } else {
                const cents = eurosToCents(valRaw);
                if (cents == null || cents <= 0) errors.discountValue = "EUR non valido";
                else parsedValue = cents;
            }
        }

        const selected = Array.isArray(form.selectedProductIds) ? form.selectedProductIds : [];
        if (!selected.length) errors.rules = "Seleziona almeno un prodotto";

        const rulesOut =
            selected.length && parsedValue != null && (discountType === "percent" || discountType === "fixed")
                ? selected.map((productId) => ({ productId, type: discountType, value: parsedValue }))
                : [];

        const merged = { ...errors };
        setFormErrors(merged);

        return {
            ok: Object.keys(merged).length === 0,
            payload: {
                code,
                name: String(form.name || "").trim() || null,
                isActive: !!form.isActive,
                startsAt: startsAtRaw || null,
                endsAt: endsAtRaw || null,
                rules: rulesOut,
            },
        };
    }

    async function handleCreateOrUpdate(e) {
        e.preventDefault();
        setErrMsg("");

        const { ok, payload } = validateForm();
        if (!ok) return;

        setLoading(true);
        try {
            if (mode === "create") {
                await apiFetch(`/api/coupons/admin`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
            } else {
                await apiFetch(`/api/coupons/admin/${encodeURIComponent(editingId)}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
            }

            resetForm();
            await loadCoupons();
        } catch (e2) {
            const payloadErrors = e2?.payload?.errors;
            if (payloadErrors && typeof payloadErrors === "object") {
                const mapped = {};
                if (payloadErrors.code) mapped.code = payloadErrors.code;
                if (payloadErrors.startsAt) mapped.startsAt = payloadErrors.startsAt;
                if (payloadErrors.endsAt) mapped.endsAt = payloadErrors.endsAt;
                if (payloadErrors.rules) mapped.rules = payloadErrors.rules;
                setFormErrors((prev) => ({ ...prev, ...mapped }));
            }
            setErrMsg(e2.message || "Errore salvataggio coupon");
        } finally {
            setLoading(false);
        }
    }

    async function deleteCoupon(c) {
        const ok = window.confirm(
            `Eliminare questo coupon?\n\n${c.code}${c.name ? " - " + c.name : ""}\n\nAzione irreversibile.`
        );
        if (!ok) return;

        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/coupons/admin/${encodeURIComponent(c._id)}`, { method: "DELETE" });
            await loadCoupons();
            if (mode === "edit" && editingId === c._id) resetForm();
        } catch (e) {
            setErrMsg(e.message || "Errore eliminazione coupon");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Coupons</h3>
                <div className="text-muted">
                    Totale: <b>{total}</b>
                </div>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            {/* Search */}
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    className="form-control"
                    style={{ maxWidth: 320 }}
                    placeholder="Cerca coupon per code o nome..."
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
                            {mode === "create" ? "Crea coupon" : `Modifica coupon: ${form.code}`}
                        </h5>
                        {mode === "edit" ? (
                            <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                                Annulla modifica
                            </button>
                        ) : null}
                    </div>

                    {rulesMixedWarning ? (
                        <div className="alert alert-warning py-2">{rulesMixedWarning}</div>
                    ) : null}

                    <form onSubmit={handleCreateOrUpdate} className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Code</label>
                            <input
                                className={`form-control ${formErrors.code ? "is-invalid" : ""}`}
                                value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                                placeholder="ES. PROMO10"
                            />
                            {formErrors.code ? <div className="invalid-feedback">{formErrors.code}</div> : null}
                            <div className="form-text">3-32, solo A-Z 0-9 _ - (sarà salvato uppercase).</div>
                        </div>

                        <div className="col-md-5">
                            <label className="form-label">Nome (opzionale)</label>
                            <input
                                className="form-control"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Descrizione interna"
                            />
                        </div>

                        <div className="col-md-2 d-flex align-items-end">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!!form.isActive}
                                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                                    id="isActiveCoupon"
                                />
                                <label className="form-check-label" htmlFor="isActiveCoupon">
                                    Attivo
                                </label>
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Inizio (opzionale)</label>
                            <input
                                type="datetime-local"
                                className={`form-control ${formErrors.startsAt ? "is-invalid" : ""}`}
                                value={form.startsAt}
                                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                            />
                            {formErrors.startsAt ? <div className="invalid-feedback">{formErrors.startsAt}</div> : null}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Fine (opzionale)</label>
                            <input
                                type="datetime-local"
                                className={`form-control ${formErrors.endsAt ? "is-invalid" : ""}`}
                                value={form.endsAt}
                                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                            />
                            {formErrors.endsAt ? <div className="invalid-feedback">{formErrors.endsAt}</div> : null}
                        </div>

                        <div className="col-12">
                            <hr className="my-2" />
                            <h6 className="m-0">Valore coupon</h6>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Tipo</label>
                            <select
                                className={`form-select ${formErrors.discountType ? "is-invalid" : ""}`}
                                value={form.discountType}
                                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                                disabled={loading}
                            >
                                <option value="percent">Percentuale (%)</option>
                                <option value="fixed">Importo fisso (EUR per unità)</option>
                            </select>
                            {formErrors.discountType ? <div className="invalid-feedback">{formErrors.discountType}</div> : null}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Valore</label>
                            <input
                                className={`form-control ${formErrors.discountValue ? "is-invalid" : ""}`}
                                value={form.discountValue}
                                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                                placeholder={form.discountType === "fixed" ? "es. 5,00" : "es. 10"}
                                disabled={loading}
                            />
                            {formErrors.discountValue ? <div className="invalid-feedback">{formErrors.discountValue}</div> : null}
                            <div className="form-text">
                                {form.discountType === "fixed" ? "EUR per unità (verrà convertito in cents)." : "1..100"}
                            </div>
                        </div>

                        <div className="col-12">
                            <hr className="my-2" />
                            <div className="d-flex align-items-center justify-content-between">
                                <h6 className="m-0">Associa prodotti</h6>
                                <div className="text-muted" style={{ fontSize: 13 }}>
                                    Selezionati: <b>{selectedCount}</b>
                                </div>
                            </div>

                            {typeof formErrors.rules === "string" ? (
                                <div className="alert alert-danger mt-2 mb-0">{formErrors.rules}</div>
                            ) : null}

                            {productsErr ? <div className="alert alert-danger mt-2 mb-0">{productsErr}</div> : null}
                            {productsLoading ? <div className="text-muted mt-2">Caricamento prodotti...</div> : null}

                            {!productsLoading && !productsErr ? (
                                <div className="table-responsive mt-2">
                                    <table className="table table-sm align-middle">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 36 }} />
                                                <th>productId</th>
                                                <th>Nome</th>
                                                <th style={{ width: 110 }}>Attivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(products || []).map((p) => {
                                                const pid = String(p.productId || "").trim();
                                                if (!pid) return null;

                                                const checked = selectedSet.has(pid);

                                                return (
                                                    <tr key={p._id || pid}>
                                                        <td>
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => toggleProduct(pid, e.target.checked)}
                                                                disabled={loading}
                                                            />
                                                        </td>
                                                        <td><code>{pid}</code></td>
                                                        <td>{p.name || "—"}</td>
                                                        <td>{p.isActive ? "✅" : "⛔️"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>

                        <div className="col-12 d-flex gap-2 mt-2">
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

            {/* Table coupons */}
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Nome</th>
                            <th>Attivo</th>
                            <th>Regole</th>
                            <th style={{ width: 240 }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.map((c) => (
                            <tr key={c._id}>
                                <td><code>{c.code}</code></td>
                                <td>{c.name || <span className="text-muted">—</span>}</td>
                                <td>{c.isActive ? "✅" : "⛔️"}</td>
                                <td className="text-muted">{Array.isArray(c.rules) ? c.rules.length : 0}</td>
                                <td className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => startEdit(c)}
                                        disabled={loading}
                                    >
                                        Modifica
                                    </button>

                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => deleteCoupon(c)}
                                        disabled={loading}
                                    >
                                        Elimina
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && coupons.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-muted py-4">
                                    Nessun coupon trovato.
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