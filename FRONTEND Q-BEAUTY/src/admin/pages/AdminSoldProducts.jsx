import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

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

const SET_PRODUCT_KEY = "SET EXPERIENCE";

export default function AdminSoldProducts() {
    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [years, setYears] = useState([]);
    const [yearFilter, setYearFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");

    const [totalPiecesSold, setTotalPiecesSold] = useState(0);
    const [products, setProducts] = useState([]);

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        if (yearFilter) sp.set("year", yearFilter);
        if (monthFilter) sp.set("month", monthFilter);
        return sp.toString();
    }, [yearFilter, monthFilter]);

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
                const next = encodeURIComponent("/admin/sold-products");
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

    async function loadYears() {
        try {
            const data = await apiFetch("/api/orders/admin/stats/years", { method: "GET" });
            const list = Array.isArray(data?.years) ? data.years.filter(Boolean) : [];
            setYears(list);
        } catch (e) {
            console.error("Errore caricamento anni:", e);
        }
    }

    async function loadSoldProducts() {
        setErrMsg("");
        setLoading(true);

        try {
            const path = qs
                ? `/api/orders/admin/sold-products?${qs}`
                : "/api/orders/admin/sold-products";

            const data = await apiFetch(path, { method: "GET" });

            const rawProducts = Array.isArray(data?.products) ? data.products : [];

            const filteredProducts = rawProducts.filter((p) => {
                const key = String(p?.productKey || "").trim().toUpperCase();
                const name = String(p?.name || "").trim().toUpperCase();
                return key !== SET_PRODUCT_KEY && name !== SET_PRODUCT_KEY;
            });

            setTotalPiecesSold(Number(data?.totalPiecesSold || 0));
            setProducts(filteredProducts);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento pezzi venduti");
            setTotalPiecesSold(0);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadYears();
    }, []);

    useEffect(() => {
        loadSoldProducts();
    }, [qs]);

    return (
        <div className="admin-sold-products">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Pezzi venduti</h3>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={yearFilter}
                    onChange={(e) => {
                        const v = e.target.value;
                        setYearFilter(v);

                        if (!v) {
                            setMonthFilter("");
                        }
                    }}
                >
                    <option value="">Tutti gli anni</option>
                    {years.map((year) => (
                        <option key={year} value={String(year)}>
                            {year}
                        </option>
                    ))}
                </select>

                <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={monthFilter}
                    disabled={!yearFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    <option value="">Tutti i mesi</option>
                    {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-12">
                    <div className="list-group">
                        <div className="list-group-item">
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                Totale pezzi venduti
                            </div>
                            <div className="fw-semibold" style={{ fontSize: 28 }}>
                                {totalPiecesSold}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2 fw-semibold">Dettaglio per prodotto</div>

            <div className="list-group">
                {products.map((p, idx) => (
                    <div
                        key={`${p.productKey || p.name}-${idx}`}
                        className="list-group-item d-flex justify-content-between align-items-start gap-3"
                    >
                        <div>
                            <div className="fw-semibold">{p?.name || "Prodotto"}</div>
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                {p?.productKey || "-"}
                            </div>
                        </div>

                        <div className="text-end">
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                Pezzi venduti
                            </div>
                            <div className="fw-semibold">{Number(p?.qtySold || 0)}</div>
                        </div>
                    </div>
                ))}

                {!loading && products.length === 0 ? (
                    <div className="list-group-item text-muted py-4">
                        Nessun dato disponibile per il filtro selezionato.
                    </div>
                ) : null}
            </div>

            {loading ? <div className="text-muted mt-3">Caricamento...</div> : null}
        </div>
    );
}