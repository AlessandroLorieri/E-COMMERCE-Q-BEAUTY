import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

function formatEURFromCents(cents) {
    const value = (Number(cents || 0) / 100) || 0;
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export default function AdminHome() {
    const apiBase = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [errMsg, setErrMsg] = useState("");

    const [range, setRange] = useState("week");

    const [years, setYears] = useState([]);
    const [year, setYear] = useState(String(new Date().getFullYear()));


    const [stats, setStats] = useState({
        range: "week",
        rangeLabel: "Ultimi 7 giorni",
        orders: 0,
        inProgress: 0,
        shipped: 0,
        revenue: { totalCents: 0, orders: 0 },
    });

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErrMsg("");

            try {
                const sp = new URLSearchParams();
                sp.set("range", range);
                if (range === "year" && year) sp.set("year", year);

                const res = await fetch(`${apiBase}/api/orders/admin/stats?${sp.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    logout();
                    const next = encodeURIComponent("/admin");
                    navigate(`/shop/login?next=${next}`, { replace: true });
                    return;
                }

                if (res.status === 403) {
                    setErrMsg("Forbidden: non sei admin");
                    return;
                }

                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.message || "Errore caricamento dashboard");

                if (!alive) return;

                setStats({
                    range: data.range || range,
                    rangeLabel: data.rangeLabel || "",
                    orders: Number(data.orders || 0),
                    inProgress: Number(data.inProgress || 0),
                    shipped: Number(data.shipped || 0),
                    revenue: {
                        totalCents: Number(data?.revenue?.totalCents || 0),
                        orders: Number(data?.revenue?.orders || 0),
                    },
                });

            } catch (e) {
                if (!alive) return;
                setErrMsg(e.message || "Errore caricamento dashboard");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        if (token) load();
        else setLoading(false);

        return () => {
            alive = false;
        };
    }, [apiBase, token, logout, navigate, range, year]);

    useEffect(() => {
        let alive = true;

        async function loadYears() {
            try {
                const res = await fetch(`${apiBase}/api/orders/admin/stats/years`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) return;

                const data = await res.json().catch(() => ({}));
                const ys = Array.isArray(data.years) ? data.years.map(String) : [];

                if (!alive) return;
                setYears(ys);

                if (ys.length) setYear(ys[ys.length - 1]);
            } catch {
            }
        }

        if (token) loadYears();

        return () => { alive = false; };
    }, [apiBase, token]);

    return (
        <div className="px-3" style={{ maxWidth: 720, margin: "0 auto", overflowX: "hidden" }}>
            {/* HEADER */}
            <div className="row g-2 align-items-center mb-4">
                <div className="col-12 col-md">
                    <h3 className="m-0">Dashboard</h3>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                        {stats.rangeLabel || "Periodo"}
                    </div>
                </div>

                <div className="col-12 col-md-auto">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-md-end">
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 200 }}
                            value={range}
                            onChange={(e) => setRange(e.target.value)}
                            disabled={loading}
                        >
                            <option value="day">Giorno</option>
                            <option value="week">Settimana</option>
                            <option value="month">Mese</option>
                            <option value="year">Anno</option>
                        </select>

                        {range === "year" ? (
                            <select
                                className="form-select form-select-sm"
                                style={{ width: 140 }}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                disabled={loading || !years.length}
                            >
                                {(years.length ? years : [String(new Date().getFullYear())]).map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        ) : null}

                        <Link to="/admin/orders" className="btn btn-outline-light btn-sm">
                            Gestisci ordini
                        </Link>
                        <Link to="/admin/products" className="btn btn-outline-light btn-sm">
                            Gestisci prodotti
                        </Link>
                    </div>
                </div>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            {/* CARDS */}
            <div className="row g-3">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body d-flex flex-row justify-content-between align-items-center">
                            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.2 }}>
                                Ordini
                            </div>
                            <div className="fs-2 fw-semibold text-end" style={{ lineHeight: 1, minWidth: 90 }}>
                                {loading ? "…" : stats.orders}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12">
                    <div className="card">
                        <div className="card-body d-flex flex-row justify-content-between align-items-center">
                            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.2 }}>
                                In lavorazione
                            </div>
                            <div className="fs-2 fw-semibold text-end" style={{ lineHeight: 1, minWidth: 90 }}>
                                {loading ? "…" : stats.inProgress}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12">
                    <div className="card">
                        <div className="card-body d-flex flex-row justify-content-between align-items-center">
                            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.2 }}>
                                Spediti
                            </div>
                            <div className="fs-2 fw-semibold text-end" style={{ lineHeight: 1, minWidth: 90 }}>
                                {loading ? "…" : stats.shipped}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12">
                    <div className="card">
                        <div className="card-body d-flex flex-row justify-content-between align-items-center">
                            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.2 }}>
                                Incasso
                            </div>
                            <div className="fs-2 fw-semibold text-end" style={{ lineHeight: 1, minWidth: 140 }}>
                                {loading ? "…" : formatEURFromCents(stats.revenue.totalCents)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


}