import { useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";
import ReviewsMasonry from "./ReviewsMasonry";
import ReviewPagination from "./ReviewPagination";
import "./ReviewsSection.css";

const PAGE_SIZE = 7;

const SIZE_PATTERN = ["wide", "normal", "tall", "normal", "normal", "wide", "normal"];
const ACCENT_PATTERN = ["gold", "rose", "dark", "gold", "rose", "dark", "gold"];

function decorateReviews(items) {
    return (Array.isArray(items) ? items : []).map((review, index) => ({
        ...review,
        size: SIZE_PATTERN[index % SIZE_PATTERN.length],
        accent: ACCENT_PATTERN[index % ACCENT_PATTERN.length],
    }));
}

export default function ReviewsSection() {
    const apiBase = import.meta.env.VITE_API_URL;

    const [reviews, setReviews] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [averageRating, setAverageRating] = useState("—");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let alive = true;

        async function loadReviews() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch(`${apiBase}/api/reviews?page=${page}&limit=${PAGE_SIZE}`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    throw new Error(data?.message || "Errore caricamento recensioni");
                }

                if (!alive) return;

                setReviews(decorateReviews(data?.reviews));
                setPage(data?.page || 1);
                setPages(data?.pages || 1);
                setTotal(data?.total || 0);
                setAverageRating(
                    Number.isFinite(Number(data?.averageRating))
                        ? Number(data.averageRating).toFixed(1)
                        : "—"
                );
            } catch (err) {
                if (!alive) return;
                setError(err.message || "Errore caricamento recensioni");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        loadReviews();

        return () => {
            alive = false;
        };
    }, [apiBase, page, refreshKey]);

    function handleCreated() {
        setPage(1);
        setRefreshKey((v) => v + 1);
    }

    return (
        <section className="qb-reviews-section">
            <div className="qb-reviews-section__intro">
                <div className="qb-reviews-section__intro-main">
                    <h1 className="qb-reviews-section__title">
                        ⟡ COSA DICONO DI Q<span className="diamond-small"></span>BEAUTY ⟡
                    </h1>
                </div>

                <div className="qb-reviews-section__stats">
                    <div className="qb-reviews-section__stat">
                        <span className="qb-reviews-section__stat-value">{total}</span>
                        <span className="qb-reviews-section__stat-label">recensioni pubblicate</span>
                    </div>
                    <div className="qb-reviews-section__stat">
                        <span className="qb-reviews-section__stat-value">{averageRating}</span>
                        <span className="qb-reviews-section__stat-label">valutazione media</span>
                    </div>
                </div>
            </div>

            {error ? <div className="alert alert-danger">{error}</div> : null}

            {!error && loading ? (
                <div className="text-light opacity-75 mb-4">Carico le recensioni...</div>
            ) : null}

            {!error && !loading && reviews.length === 0 ? (
                <div className="text-light opacity-75 mb-4">Nessuna recensione pubblicata per ora.</div>
            ) : null}

            {!error && !loading && reviews.length > 0 ? (
                <>
                    <ReviewsMasonry reviews={reviews} pageKey={page} />

                    <ReviewPagination
                        page={page}
                        pages={pages}
                        onPrev={() => setPage((p) => Math.max(1, p - 1))}
                        onNext={() => setPage((p) => Math.min(pages, p + 1))}
                        onGoTo={setPage}
                    />
                </>
            ) : null}

            <ReviewForm onCreated={handleCreated} />
        </section>
    );
}