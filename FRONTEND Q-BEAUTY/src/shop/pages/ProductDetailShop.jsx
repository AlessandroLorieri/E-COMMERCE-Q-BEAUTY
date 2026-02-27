import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import BrandSpinner from "../components/BrandSpinner";
import { formatEURFromCents } from "../utils/money";
import { useAuth } from "../context/AuthContext";

import "./ProductDetailShop.css";

export default function ProductDetailShop() {
    const apiBase = import.meta.env.VITE_API_URL;

    const { id } = useParams();
    const { addToCartQty, cart } = useShop();
    const { user } = useAuth();

    const [product, setProduct] = useState(null);
    const [qty, setQty] = useState(1);

    const inCart = cart.find((i) => i.id === product?.id);
    const inCartQty = inCart?.qty ?? 0;
    const available = Math.max(0, (product?.stockQty ?? 0) - inCartQty);
    const isOut = available <= 0;

    const isPiva = user?.customerType === "piva";
    const SET_PRODUCT_ID = "SET EXPERIENCE";
    const SET_ID_NORM = SET_PRODUCT_ID.trim().toLowerCase();

    const badgeObj = product?.badge;
    const badgeTextRaw = badgeObj?.enabled
        ? (isPiva ? badgeObj?.pivaText : badgeObj?.privateText)
        : null;

    const badgeText = String(badgeTextRaw || "").trim();
    const showBadge = !!badgeText;

    const badgeStyle = showBadge
        ? {
            backgroundColor: String(badgeObj?.bgColor || "#e53935"),
            color: String(badgeObj?.textColor || "#ffffff"),
        }
        : undefined;

    const isSet = String(product?.productId || product?.id || "").trim().toLowerCase() === SET_ID_NORM;
    const displayPriceCents = isSet ? (isPiva ? 5400 : 6000) : Number(product?.priceCents || 0);

    const hasCompareAt =
        Number.isFinite(Number(product?.compareAtPriceCents)) &&
        Number(product?.compareAtPriceCents) > displayPriceCents;

    const images = useMemo(() => {
        const cover = String(product?.imageUrl || "").trim();
        const gallery = Array.isArray(product?.galleryImageUrls) ? product.galleryImageUrls : [];

        const all = [cover, ...gallery]
            .map((s) => String(s || "").trim())
            .filter(Boolean);

        const seen = new Set();
        const out = [];
        for (const u of all) {
            if (!seen.has(u)) {
                seen.add(u);
                out.push(u);
            }
        }
        return out;
    }, [product]);

    function pickNextValidIndex(fromIdx, dir) {
        if (!images.length) return -1;

        for (let step = 1; step <= images.length; step++) {
            const idx = (fromIdx + dir * step + images.length) % images.length;
            if (!imgErrors[idx]) return idx;
        }
        return -1;
    }

    function goPrev() {
        const next = pickNextValidIndex(activeImgIdx, -1);
        if (next >= 0) setActiveImgIdx(next);
    }

    function goNext() {
        const next = pickNextValidIndex(activeImgIdx, +1);
        if (next >= 0) setActiveImgIdx(next);
    }

    function onImgError(idx) {
        setImgErrors((prev) => ({ ...prev, [idx]: true }));

        const next = pickNextValidIndex(idx, +1);
        if (next >= 0) setActiveImgIdx(next);
    }

    useEffect(() => {
        setQty((prev) => {
            const n = Math.max(1, Number(prev) || 1);
            if (available <= 0) return 1;
            return Math.min(n, available);
        });
    }, [available]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [imgErrors, setImgErrors] = useState({});


    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError("");
            setProduct(null);
            setActiveImgIdx(0);
            setImgErrors({});
            setQty(1);

            try {
                const res = await fetch(`${apiBase}/api/products/${encodeURIComponent(id)}`);
                const data = await res.json().catch(() => ({}));

                if (!alive) return;

                if (res.status === 404) {
                    setProduct(null);
                    return;
                }

                if (!res.ok) throw new Error(data?.message || "Errore caricamento prodotto");

                const found = data.product;

                setProduct(found ? { ...found, id: found.productId } : null);

            } catch (err) {
                if (!alive) return;
                setError(err.message || "Errore caricamento prodotto");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [apiBase, id]);

    useEffect(() => {
        if (!images.length) {
            setActiveImgIdx(0);
            return;
        }
        if (activeImgIdx >= images.length) {
            setActiveImgIdx(0);
        }
    }, [images.length, activeImgIdx]);

    function handleAdd() {
        if (!product) return;
        const q = Math.max(1, Number(qty) || 1);
        const safeQ = Math.min(q, available);

        if (safeQ <= 0) return;

        const productToAdd = isSet && isPiva ? { ...product, priceCents: 5400 } : product;
        addToCartQty(productToAdd, safeQ);
        setQty(1);
    }

    if (loading) {
        return <BrandSpinner text="Carico il prodotto..." />;
    }

    if (error) {
        return (
            <div className="shop-page">
                <div className="container py-4">
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                    <Link to="/shop" className="btn btn-outline-light">Torna allo shop</Link>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container py-4">
                <p>Prodotto non trovato.</p>
                <Link to="/shop" className="btn btn-outline-light">Torna allo shop</Link>
            </div>
        );
    }

    return (
        <div className="shop-page">
            <div className="container py-4 product-detail">
                <Link to="/shop" className="btn shop-btn-outline mb-3">
                    ← Indietro
                </Link>

                <div className="card shop-card product-detail-card">
                    <div className="product-detail-grid">

                        <div className="product-detail-media-row">
                            {/* FOTO */}
                            <div className="product-detail-media">
                                {images.length > 0 ? (
                                    <div style={{ position: "relative" }}>
                                        {showBadge ? (
                                            <div className="product-detail-badge" style={badgeStyle}>
                                                {badgeText}
                                            </div>
                                        ) : null}

                                        <img
                                            src={images[activeImgIdx]}
                                            alt={product.name}
                                            className="product-detail-img"
                                            onError={() => onImgError(activeImgIdx)}
                                        />

                                        {images.length > 1 ? (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    left: 10,
                                                    right: 10,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="btn btn-sm product-detail-nav-btn"
                                                    onClick={goPrev}
                                                    style={{ pointerEvents: "auto" }}
                                                    aria-label="Immagine precedente"
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm product-detail-nav-btn"
                                                    onClick={goNext}
                                                    style={{ pointerEvents: "auto" }}
                                                    aria-label="Immagine successiva"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="product-detail-img product-detail-img-fallback d-flex align-items-center justify-content-center">
                                        <span className="text-muted" style={{ fontSize: 13 }}>
                                            Nessuna immagine
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* THUMBS */}
                            {images.length > 1 ? (
                                <div className="product-detail-thumbs-row">
                                    {images.map((url, idx) => {
                                        const isActive = idx === activeImgIdx;
                                        const isBroken = !!imgErrors[idx];
                                        if (isBroken) return null;

                                        return (
                                            <button
                                                key={url + idx}
                                                type="button"
                                                className={`btn btn-sm ${isActive ? "btn-light" : "btn-outline-light"}`}
                                                onClick={() => setActiveImgIdx(idx)}
                                                style={{ padding: 0, width: 44, height: 44, overflow: "hidden" }}
                                                aria-label={`Vai a immagine ${idx + 1}`}
                                            >
                                                <img
                                                    src={url}
                                                    alt=""
                                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                    onError={() => onImgError(idx)}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {/* BOTTONI */}
                            <div className="product-detail-media-side">
                                <div className="product-detail-actions product-detail-actions--side">
                                    <div className="product-detail-qty">
                                        <label className="form-label mb-0">Quantità</label>
                                        <input
                                            type="number"
                                            className="form-control product-detail-qty-input"
                                            min={1}
                                            max={available > 0 ? available : undefined}
                                            value={qty}
                                            disabled={isOut}
                                            onChange={(e) => {
                                                const v = Math.max(1, Number(e.target.value) || 1);
                                                setQty(available > 0 ? Math.min(v, available) : 1);
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="btn shop-btn-primary"
                                        onClick={handleAdd}
                                        disabled={isOut}
                                    >
                                        {isOut ? "Esaurito" : "Aggiungi al carrello"}
                                    </button>

                                    <Link to="/shop/cart" className="btn shop-btn-outline">
                                        Vai al carrello
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="product-detail-content">
                            <div className="product-detail-top">
                                <div>
                                    <h2 className="product-detail-title mb-1">{product.name}</h2>

                                    {product.shortDesc ? (
                                        <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.35 }}>
                                            {product.shortDesc}
                                        </div>
                                    ) : null}

                                    <div className="text-muted" style={{ fontSize: 13 }}>
                                        {inCartQty > 0 ? (
                                            <span>Nel carrello: <b>{inCartQty}</b></span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="product-detail-price">
                                    {hasCompareAt ? (
                                        <div className="product-detail-price-row">
                                            <div className="product-detail-price-old">
                                                {formatEURFromCents(product.compareAtPriceCents)}
                                            </div>
                                            <div className="product-detail-price-now">
                                                {formatEURFromCents(displayPriceCents)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="product-detail-price-now">
                                            {formatEURFromCents(displayPriceCents)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {product.description ? (
                                <div className="product-detail-block">
                                    <h5 className="product-detail-block-title">Descrizione</h5>
                                    <p className="mb-0">{product.description}</p>
                                </div>
                            ) : null}

                            {Array.isArray(product.howTo) && product.howTo.length > 0 ? (
                                <div className="product-detail-block">
                                    <h5 className="product-detail-block-title">Come si usa</h5>
                                    <ul className="mb-0 product-detail-howto-list">
                                        {product.howTo.map((step, i) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {Array.isArray(product.ingredients) && product.ingredients.length > 0 ? (
                                <div className="product-detail-block">
                                    <h5 className="product-detail-block-title">Ingredienti</h5>
                                    <ul className="mb-0">
                                        {product.ingredients.map((ing, i) => (
                                            <li key={i}>{ing}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}
