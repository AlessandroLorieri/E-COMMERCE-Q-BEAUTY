import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

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
        return iso || "-";
    }
}

export default function AdminUsers() {
    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [q, setQ] = useState("");
    const [openId, setOpenId] = useState(null);

    const qs = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", String(limit));
        if (q.trim()) sp.set("q", q.trim());
        return sp.toString();
    }, [page, limit, q]);

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
                const next = encodeURIComponent("/admin/users");
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

    async function loadUsers() {
        setErrMsg("");
        setLoading(true);

        try {
            const data = await apiFetch(`/api/auth/admin/users?${qs}`, { method: "GET" });
            const list = Array.isArray(data.users) ? data.users.filter((u) => u && u._id) : [];

            setUsers(list);
            setPage(data.page || 1);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento utenti");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, [qs]);

    return (
        <div className="admin-users">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Utenti</h3>
                <div className="text-muted">
                    Totale: <b>{total}</b>
                </div>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    className="form-control"
                    style={{ maxWidth: 360 }}
                    placeholder="Cerca email, nome, ragione sociale, P.IVA, SDI, PEC..."
                    value={q}
                    onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                    }}
                />

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
                {(users || []).map((u) => {
                    const isOpen = openId === u._id;

                    const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || "-";
                    const customerType =
                        String(u?.customerType || "").trim() === "piva" ? "Partita IVA" : "Privato";

                    const companyName = u?.companyName || "-";
                    const vatNumber = u?.vatNumber || "-";
                    const taxCode = u?.taxCode || "-";
                    const sdiCode = u?.sdiCode || "-";
                    const pec = u?.pec || "-";
                    const phone = u?.phone || "-";
                    const orders = Array.isArray(u?.orders) ? u.orders.filter(Boolean) : [];

                    return (
                        <div
                            key={u._id}
                            className={`list-group-item ${isOpen ? "border border-primary" : ""}`}
                        >
                            <button
                                type="button"
                                className="btn p-0 border-0 bg-transparent w-100 text-start"
                                onClick={() => setOpenId((prev) => (prev === u._id ? null : u._id))}
                                aria-expanded={isOpen}
                            >
                                <div className="d-flex justify-content-between align-items-start gap-3">
                                    <div>
                                        <div className="fw-semibold">
                                            {fullName}
                                        </div>
                                        <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: 13 }}>
                                            <span className="text-muted">
                                                {u?.email || "-"}
                                            </span>
                                            <span className="badge text-bg-secondary">{customerType}</span>
                                        </div>
                                    </div>

                                    <div className="text-end">
                                        <div className="text-muted" style={{ fontSize: 13 }}>Registrato il</div>
                                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                                            {formatDate(u?.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {isOpen ? (
                                <div className="mt-3 pt-3 border-top">
                                    <div className="row g-3">
                                        <div className="col-12 col-lg-6">
                                            <div className="fw-semibold mb-2">Dati utente</div>
                                            <div style={{ fontSize: 14 }}>
                                                <div><span className="text-muted">Nome:</span> <b>{u?.firstName || "-"}</b></div>
                                                <div><span className="text-muted">Cognome:</span> <b>{u?.lastName || "-"}</b></div>
                                                <div><span className="text-muted">Email:</span> <b>{u?.email || "-"}</b></div>
                                                <div><span className="text-muted">Telefono:</span> <b>{phone}</b></div>
                                                <div><span className="text-muted">Tipo cliente:</span> <b>{customerType}</b></div>
                                                <div><span className="text-muted">Ruolo:</span> <b>{u?.role || "user"}</b></div>
                                                <div><span className="text-muted">Registrato il:</span> <b>{formatDate(u?.createdAt)}</b></div>
                                            </div>
                                        </div>

                                        <div className="col-12 col-lg-6">
                                            <div className="fw-semibold mb-2">Fatturazione</div>
                                            <div style={{ fontSize: 14 }}>
                                                <div><span className="text-muted">Ragione sociale:</span> <b>{companyName}</b></div>
                                                <div><span className="text-muted">Partita IVA:</span> <b>{vatNumber}</b></div>
                                                <div><span className="text-muted">Codice fiscale:</span> <b>{taxCode}</b></div>
                                                <div><span className="text-muted">Codice SDI:</span> <b>{sdiCode}</b></div>
                                                <div><span className="text-muted">PEC:</span> <b>{pec}</b></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="fw-semibold mb-2">Ordini</div>

                                        <div className="list-group">
                                            <div className="list-group-item" style={{ fontSize: 14 }}>
                                                {orders.length ? (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {orders.map((orderId) => (
                                                            <span key={orderId} className="badge text-bg-light border">
                                                                {orderId}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">Nessun ordine</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
                                        ID utente: {u._id}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {!loading && users.length === 0 ? (
                    <div className="list-group-item text-muted py-4">Nessun utente trovato.</div>
                ) : null}
            </div>

            {loading ? <div className="text-muted mt-3">Caricamento...</div> : null}
        </div>
    );
}