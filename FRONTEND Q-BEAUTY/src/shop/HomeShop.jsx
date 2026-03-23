import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "./context/ShopContext";
import BrandSpinner from "./components/BrandSpinner";
import { formatEURFromCents } from "./utils/money";
import { useAuth } from "./context/AuthContext";
import ReviewsSection from "./components/reviews/ReviewsSection";
import HomePromoBanner from "./components/HomePromoBanner";
import Seo from "../components/Seo";

import "./HomeShop.css";

export default function HomeShop() {
    const apiBase = import.meta.env.VITE_API_URL;

    const { cart, addToCartQty } = useShop();

    const { user } = useAuth();
    const isPiva = user?.customerType === "piva";

    const SET_PRODUCT_ID = "SET EXPERIENCE";
    const SET_ID_NORM = SET_PRODUCT_ID.trim().toLowerCase();
    const SET_COMPONENT_IDS = [
        "CREMA IDRATANTE CHERATOLITICA",
        "BURRO EMOLLIENTE",
        "SPRAY IGIENIZZANTE",
    ];

    const [products, setProducts] = useState([]);
    const [qtyById, setQtyById] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [imgFailed, setImgFailed] = useState({});
    const [addedFlashById, setAddedFlashById] = useState({});
    const addFlashTimersRef = useRef({});

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
        return () => {
            Object.values(addFlashTimersRef.current).forEach((timerId) => {
                clearTimeout(timerId);
            });
        };
    }, []);

    function isSetProduct(p) {
        const pid = String(p?.productId || p?.id || "").trim().toLowerCase();
        return pid === SET_ID_NORM;
    }

    function getCartQtyForProduct(product) {
        const keys = [
            product?.id,
            product?.productId,
            product?._id,
        ]
            .filter(Boolean)
            .map((x) => String(x));

        const found = cart.find((item) => keys.includes(String(item?.id || "")));
        return found?.qty ?? 0;
    }

    function normalizeProductKey(v) {
        return String(v || "").trim().toUpperCase();
    }

    function getProductStockQty(product) {
        const n = Number(product?.stockQty);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.floor(n));
    }

    function findProductByProductId(productId) {
        const wanted = normalizeProductKey(productId);
        return (
            products.find((p) => normalizeProductKey(p?.productId || p?.id) === wanted) || null
        );
    }

    function getSetQtyInCart() {
        const setProduct = findProductByProductId(SET_PRODUCT_ID);
        if (!setProduct) return 0;
        return getCartQtyForProduct(setProduct);
    }

    function isSetComponentProduct(product) {
        const pid = normalizeProductKey(product?.productId || product?.id);
        return SET_COMPONENT_IDS.some(
            (componentId) => normalizeProductKey(componentId) === pid
        );
    }

    function getSetBaseAvailableQty() {
        const values = SET_COMPONENT_IDS.map((componentId) => {
            const component = findProductByProductId(componentId);
            if (!component) return 0;
            return getProductStockQty(component);
        });

        return values.length ? Math.min(...values) : 0;
    }

    function getSetAvailableQty() {
        const setQtyInCart = getSetQtyInCart();

        const values = SET_COMPONENT_IDS.map((componentId) => {
            const component = findProductByProductId(componentId);
            if (!component) return 0;

            const stockQty = getProductStockQty(component);
            const singleQtyInCart = getCartQtyForProduct(component);

            return Math.max(0, stockQty - singleQtyInCart - setQtyInCart);
        });

        return values.length ? Math.min(...values) : 0;
    }

    function getAvailableQty(product) {
        if (isSetProduct(product)) {
            return getSetAvailableQty();
        }

        const stockQty = getProductStockQty(product);
        const inCartQty = getCartQtyForProduct(product);
        const setQtyInCart = getSetQtyInCart();

        if (isSetComponentProduct(product)) {
            return Math.max(0, stockQty - inCartQty - setQtyInCart);
        }

        return Math.max(0, stockQty - inCartQty);
    }

    function handleAdd(product) {
        const available = getAvailableQty(product);
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

        const key = String(product.id);

        if (addFlashTimersRef.current[key]) {
            clearTimeout(addFlashTimersRef.current[key]);
        }

        setAddedFlashById((prev) => ({ ...prev, [key]: true }));

        addFlashTimersRef.current[key] = setTimeout(() => {
            setAddedFlashById((prev) => ({ ...prev, [key]: false }));
            delete addFlashTimersRef.current[key];
        }, 1400);
    }


    if (loading) {
        return <BrandSpinner text="Carico i prodotti..." />;
    }

    return (
        <>
            <Seo
                title="Shop Q•BEAUTY | Prodotti professionali per pedicure"
                description="Scopri lo shop Q•BEAUTY: prodotti professionali per pedicure e cura del piede, con formule di alta qualità e identità forte."
                canonical="/shop"
                image="/img/last.jpg"
            />
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
                        <source src="https://cdn.qbeautyshop.it/shop-hero-lite.mp4" type="video/mp4" />
                    </video>
                    <div className="shop-hero-overlay" />
                </section>
            ) : null}

            {/* BANNER*/}
            {!error ? <HomePromoBanner /> : null}

            {/* CONTENUTO SHOP*/}
            <div className="container-fluid shop-page p-5">
                <h1 className="visually-hidden">
                    Shop Q•BEAUTY, prodotti professionali per pedicure e cura del piede
                </h1>
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
                        <div className="row g-4">
                            {products.map((p) => {
                                const inCartQty = getCartQtyForProduct(p);
                                const selectedQty = qtyById[p.id] ?? 1;

                                const isSet = isSetProduct(p);
                                const stockQty = getProductStockQty(p);
                                const setBaseAvailableQty = isSet ? getSetBaseAvailableQty() : null;
                                const available = getAvailableQty(p);
                                const isOut = available <= 0;
                                const maxReachedInCart = isSet
                                    ? (setBaseAvailableQty > 0 && available <= 0)
                                    : (stockQty > 0 && available <= 0);

                                const justAdded = !!addedFlashById[String(p.id)];
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
                                                    className="form-control mb-3 shop-qty-input"
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

                                                {maxReachedInCart ? (
                                                    <div className="text-warning mb-3" style={{ fontSize: 13 }}>
                                                        Hai già raggiunto la quantità massima disponibile per questo prodotto.
                                                    </div>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    className="btn shop-btn-primary mt-auto"
                                                    disabled={isOut}
                                                    onClick={() => handleAdd(p)}
                                                >
                                                    {isSet
                                                        ? setBaseAvailableQty <= 0
                                                            ? "Esaurito"
                                                            : maxReachedInCart
                                                                ? "Quantità massima raggiunta"
                                                                : justAdded
                                                                    ? "Aggiunto ✓"
                                                                    : "Aggiungi al carrello"
                                                        : stockQty <= 0
                                                            ? "Esaurito"
                                                            : maxReachedInCart
                                                                ? "Quantità massima raggiunta"
                                                                : justAdded
                                                                    ? "Aggiunto ✓"
                                                                    : "Aggiungi al carrello"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                <ReviewsSection />
            </div>
        </>
    );

}
