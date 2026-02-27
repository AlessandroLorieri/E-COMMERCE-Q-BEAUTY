import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "./context/ShopContext";
import BrandSpinner from "./components/BrandSpinner";
import { formatEURFromCents } from "./utils/money";
import { useAuth } from "./context/AuthContext";

import "./HomeShop.css";

export default function HomeShop() {
    const apiBase = import.meta.env.VITE_API_URL;

    const { cart, addToCartQty } = useShop();

    const { user } = useAuth();
    const isPiva = user?.customerType === "piva";

    const SET_PRODUCT_ID = "SET EXPERIENCE";
    const SET_ID_NORM = SET_PRODUCT_ID.trim().toLowerCase();

    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const limit = 8;
    const [qtyById, setQtyById] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [imgFailed, setImgFailed] = useState({});

    const pages = Math.max(1, Math.ceil(products.length / limit));
    const safePage = Math.min(Math.max(1, page), pages);
    const startIndex = (safePage - 1) * limit;
    const pageItems = products.slice(startIndex, startIndex + limit);

    const canPrev = safePage > 1;
    const canNext = safePage < pages;

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const res = await fetch(`${apiBase}/api/products`);
                const data = await res.json();

                if (!res.ok) throw new Error(data?.message || "Errore caricamento prodotti");

                const list = Array.isArray(data.products) ? data.products : [];

                const normalized = list.map((p) => ({
                    ...p,
                    id: p.productId,
                    stockQty: Number.isFinite(Number(p.stockQty)) ? Number(p.stockQty) : 0,
                }));

                if (!alive) return;

                setImgFailed({});
                setProducts(normalized);

                setQtyById((prev) => {
                    const next = { ...prev };
                    const ids = new Set(normalized.map((p) => p.id));

                    for (const p of normalized) {
                        if (next[p.id] == null) next[p.id] = 1;
                    }

                    for (const k of Object.keys(next)) {
                        if (!ids.has(k)) delete next[k];
                    }

                    return next;
                });
            } catch (err) {
                if (!alive) return;
                setError(err.message || "Errore caricamento prodotti");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [apiBase]);

    useEffect(() => {
        setPage((p) => {
            const maxPage = Math.max(1, Math.ceil(products.length / limit));
            return Math.min(Math.max(1, p), maxPage);
        });
    }, [products.length, limit]);

    function isSetProduct(p) {
        const pid = String(p?.productId || p?.id || "").trim().toLowerCase();
        return pid === SET_ID_NORM;
    }


    function handleAdd(product) {
        const inCart = cart.find((item) => item.id === product.id);
        const inCartQty = inCart?.qty ?? 0;

        const available = Math.max(0, (product.stockQty ?? 0) - inCartQty);
        if (available <= 0) return;

        const wanted = qtyById[product.id] ?? 1;
        const q = Math.min(Math.max(1, Number(wanted) || 1), available);

        const isSet = isSetProduct(product);
        const productToAdd =
            isSet && isPiva
                ? { ...product, priceCents: 5400 }
                : product;

        addToCartQty(productToAdd, q);


        setQtyById((prev) => ({ ...prev, [product.id]: 1 }));
    }


    if (loading) {
        return <BrandSpinner text="Carico i prodotti..." />;
    }

    return (
        <>
            {/* HERO VIDEO*/}
            {!error ? (
                <section className="shop-hero p-0">
                    <video
                        className="shop-hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    >
                        <source src="/video/shop-hero.mp4" type="video/mp4" />
                    </video>
                    <div className="shop-hero-overlay" />
                </section>
            ) : null}

            {/* CONTENUTO SHOP*/}
            <div className="container-fluid shop-page p-5">
                {error ? (
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                ) : null}

                {!error && products.length === 0 ? (
                    <div className="card p-3">
                        <p className="mb-0">Nessun prodotto disponibile.</p>
                    </div>
                ) : (
                    <>
                        {pages > 1 ? (
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="text-muted" style={{ fontSize: 14 }}>
                                    Pagina <b>{safePage}</b> / {pages}
                                </div>

                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm"
                                        disabled={!canPrev}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        Prev
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm"
                                        disabled={!canNext}
                                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="row g-4">
                            {pageItems.map((p, idx) => {
                                const inCart = cart.find((item) => item.id === p.id);
                                const inCartQty = inCart?.qty ?? 0;
                                const selectedQty = qtyById[p.id] ?? 1;
                                const available = Math.max(0, (p.stockQty ?? 0) - inCartQty);
                                const isOut = available <= 0;
                                const isSet = isSetProduct(p);
                                const displayPriceCents = isSet ? (isPiva ? 5400 : 6000) : Number(p.priceCents || 0);

                                return (
                                    <div key={p.id} className="col-12 col-lg-6">
                                        <div className="card h-100 shop-card">

                                            {(() => {
                                                const badge = p.badge;
                                                const raw = isPiva ? badge?.pivaText : badge?.privateText;
                                                const text = typeof raw === "string" ? raw.trim() : "";
                                                const show = !!badge?.enabled && !!text;

                                                if (!show) return null;

                                                const style = {};
                                                if (badge?.bgColor) style["--qb-badge-bg"] = badge.bgColor;
                                                if (badge?.textColor) style["--qb-badge-text"] = badge.textColor;

                                                return (
                                                    <div className="shop-card-badge" style={style}>
                                                        {text}
                                                    </div>
                                                );
                                            })()}

                                            {p.imageUrl && !imgFailed[p.id] ? (
                                                <img
                                                    src={p.imageUrl}
                                                    alt={p.name}
                                                    className="card-img-top shop-card-img"
                                                    onError={() => setImgFailed((prev) => ({ ...prev, [p.id]: true }))}
                                                />
                                            ) : (
                                                <div className="d-flex align-items-center justify-content-center shop-card-img-fallback">
                                                    <span className="text-muted" style={{ fontSize: 13 }}>
                                                        Nessuna immagine
                                                    </span>
                                                </div>
                                            )}

                                            <div className="card-body d-flex flex-column">
                                                <h5 className="card-title">{p.name}</h5>

                                                {p.shortDesc ? (
                                                    <div className="text-muted mb-2" style={{ fontSize: 14, lineHeight: 1.3 }}>
                                                        {p.shortDesc}
                                                    </div>
                                                ) : null}

                                                {Number.isFinite(Number(p.compareAtPriceCents)) && Number(p.compareAtPriceCents) > displayPriceCents ? (
                                                    <div className="shop-price-row mb-2">
                                                        <span className="shop-price-old">{formatEURFromCents(p.compareAtPriceCents)}</span>
                                                        <span className="shop-price-now">{formatEURFromCents(displayPriceCents)}</span>
                                                    </div>
                                                ) : (
                                                    <p className="card-text mb-2">{formatEURFromCents(displayPriceCents)}</p>
                                                )}

                                                {inCartQty > 0 ? (
                                                    <div className="text-muted mb-2" style={{ fontSize: 15 }}>
                                                        Nel carrello: <b>{inCartQty}</b>
                                                    </div>
                                                ) : null}

                                                <Link to={`/shop/product/${p.id}`} className="btn shop-btn-outline mb-3">
                                                    Dettagli
                                                </Link>

                                                <label className="form-label mb-1">Quantità</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={available > 0 ? available : 1}
                                                    className="form-control mb-3"
                                                    value={available > 0 ? Math.min(selectedQty, available) : 0}
                                                    disabled={isOut}
                                                    onChange={(e) => {
                                                        const v = Math.max(1, Number(e.target.value) || 1);
                                                        setQtyById((prev) => ({
                                                            ...prev,
                                                            [p.id]: available > 0 ? Math.min(v, available) : 1,
                                                        }));
                                                    }}
                                                />

                                                <button
                                                    type="button"
                                                    className="btn shop-btn-primary mt-auto"
                                                    disabled={isOut}
                                                    onClick={() => handleAdd(p)}
                                                >
                                                    {isOut ? "Esaurito" : "Aggiungi al carrello"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {pages > 1 ? (
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-light btn-sm"
                                    disabled={!canPrev}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-light btn-sm"
                                    disabled={!canNext}
                                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </>
    );

}
