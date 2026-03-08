import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shop/context/AuthContext";

function formatDate(value) {
    try {
        return new Date(value).toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
}

function shortText(value, max = 120) {
    const s = String(value || "").trim();
    if (!s) return "—";
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default function AdminReviews() {
    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [reviews, setReviews] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [q, setQ] = useState("");
    const [approvedFilter, setApprovedFilter] = useState("false");

    const canGoPrev = page > 1;
    const canGoNext = page < pages;

    const queryString = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", String(limit));
        if (q.trim()) sp.set("q", q.trim());
        if (approvedFilter === "true" || approvedFilter === "false") {
            sp.set("approved", approvedFilter);
        }
        return sp.toString();
    }, [page, limit, q, approvedFilter]);

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
                const next = encodeURIComponent("/admin/reviews");
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

    async function loadReviews() {
        setErrMsg("");
        setLoading(true);
        try {
            const data = await apiFetch(`/api/reviews/admin?${queryString}`, { method: "GET" });
            setReviews(data.reviews || []);
            setPage(data.page || 1);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            setErrMsg(e.message || "Errore caricamento recensioni");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReviews();
    }, [queryString]);

    async function approveReview(review) {
        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/reviews/admin/${encodeURIComponent(review._id)}/approve`, {
                method: "PATCH",
            });
            await loadReviews();
        } catch (e) {
            setErrMsg(e.message || "Errore approvazione recensione");
        } finally {
            setLoading(false);
        }
    }

    async function rejectReview(review) {
        const ok = window.confirm(
            `Eliminare questa recensione?\n\n${review.name || "Utente"}\n\nAzione irreversibile.`
        );
        if (!ok) return;

        setErrMsg("");
        setLoading(true);
        try {
            await apiFetch(`/api/reviews/admin/${encodeURIComponent(review._id)}`, {
                method: "DELETE",
            });
            await loadReviews();
        } catch (e) {
            setErrMsg(e.message || "Errore eliminazione recensione");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="m-0">Recensioni</h3>
                <div className="text-muted">
                    Totale: <b>{total}</b>
                </div>
            </div>

            {errMsg ? <div className="alert alert-danger">{errMsg}</div> : null}

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input
                    className="form-control"
                    style={{ maxWidth: 320 }}
                    placeholder="Cerca per nome, email o testo..."
                    value={q}
                    onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                    }}
                />

                <select
                    className="form-select"
                    style={{ maxWidth: 220 }}
                    value={approvedFilter}
                    onChange={(e) => {
                        setPage(1);
                        setApprovedFilter(e.target.value);
                    }}
                >
                    <option value="false">Solo da approvare</option>
                    <option value="true">Solo approvate</option>
                    <option value="all">Tutte</option>
                </select>

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

            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Rating</th>
                            <th>Ruolo / città</th>
                            <th>Testo</th>
                            <th>Stato</th>
                            <th>Data</th>
                            <th style={{ width: 220 }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reviews.map((r) => (
                            <tr key={r._id}>
                                <td>{r.name || "—"}</td>
                                <td>{r.email || "—"}</td>
                                <td>{r.rating ? `${r.rating}/5` : "—"}</td>
                                <td>
                                    {[r.role, r.city].filter(Boolean).join(" · ") || (
                                        <span className="text-muted">—</span>
                                    )}
                                </td>
                                <td>{shortText(r.text)}</td>
                                <td>{r.approved ? "✅ Approvata" : "⏳ In attesa"}</td>
                                <td>{formatDate(r.createdAt)}</td>
                                <td className="d-flex gap-2">
                                    {!r.approved ? (
                                        <button
                                            className="btn btn-sm btn-outline-success"
                                            disabled={loading}
                                            onClick={() => approveReview(r)}
                                        >
                                            Approva
                                        </button>
                                    ) : null}

                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={loading}
                                        onClick={() => rejectReview(r)}
                                    >
                                        Elimina
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && reviews.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-muted py-4">
                                    Nessuna recensione trovata.
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