import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { toCents, formatEURFromCents } from "../utils/money";
import { useAuth } from "../context/AuthContext";

import "./CartShop.css";

const IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <rect x="10" y="10" width="108" height="108" rx="12" ry="12" fill="#222" stroke="#3a3a3a"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
        fill="#bfa35a" font-family="Arial" font-size="12">Q•BEAUTY</text>
    </svg>
`);

export default function CartShop() {
    const navigate = useNavigate();
    const {
        cart,
        totals,
        inc,
        dec,
        removeFromCart,
        user: shopUser,
        quote,
        quoteLoading,
        quoteError,
        quoteErrors,
        couponCode,
        setCouponCode,
        productsLoading,
        productsError
    } = useShop();

    const { user: authUser } = useAuth();
    const isPiva = authUser?.customerType === "piva";

    const couponDiscountCents =
        Number(quote?.couponDiscountCents) ||
        Number(quote?.discountBreakdown?.couponDiscountCents) ||
        0;

    const globalDiscountCents =
        Number(quote?.globalDiscountCents) ||
        Number(quote?.discountBreakdown?.globalDiscountCents) ||
        0;

    const globalDiscountLabel =
        quote?.discountType === "piva15"
            ? "Sconto P.IVA -15%"
            : quote?.discountType === "first10"
                ? "Primo acquisto -10%"
                : (quote?.discountLabel || "Sconto");

    const couponLabelCode =
        quote?.couponCodeApplied ||
        (typeof couponCode === "string" ? couponCode.trim() : "") ||
        "";

    const subtotalCents = Number(quote?.subtotalCents) || 0;
    const discountCents = Number(quote?.discountCents) || 0;

    const totalFromBackend = Number(quote?.totalCents);
    const totalCentsSafe = Number.isFinite(totalFromBackend)
        ? totalFromBackend
        : Math.max(0, subtotalCents - discountCents);

    const shippingCentsSafe = Number.isFinite(Number(quote?.shippingCents))
        ? Number(quote.shippingCents)
        : 0;

    const totalNoShippingCents = Math.max(0, totalCentsSafe - shippingCentsSafe);

    const couponAppliedCode = quote?.couponCodeApplied ? String(quote.couponCodeApplied).trim() : "";
    const couponErrorMsg = quoteErrors?.couponCode ? String(quoteErrors.couponCode) : "";
    const genericQuoteMsg = !couponErrorMsg && quoteError ? String(quoteError) : "";

    const [couponDraft, setCouponDraft] = useState(couponCode || "");
    const [autoCouponMsg, setAutoCouponMsg] = useState("");
    const [lastAutoClearedCode, setLastAutoClearedCode] = useState("");

    useEffect(() => {
        setCouponDraft(couponCode || "");
    }, [couponCode]);

    useEffect(() => {
        const code = String(couponCode || "").trim();
        if (!code) return;
        if (!couponErrorMsg) return;

        if (quoteLoading) return;

        const msg = String(couponErrorMsg).toLowerCase();

        const shouldAutoClear =
            msg.includes("scad") ||
            msg.includes("expired") ||
            msg.includes("non valido") ||
            msg.includes("invalid") ||
            msg.includes("inesistente") ||
            msg.includes("not valid");

        if (!shouldAutoClear) return;

        if (lastAutoClearedCode === code) return;

        setLastAutoClearedCode(code);

        setCouponDraft("");
        setCouponCode("");

        setAutoCouponMsg(`Il coupon "${code}" non è valido o è scaduto.`);
    }, [couponCode, couponErrorMsg, quoteLoading, lastAutoClearedCode, setCouponCode]);

    function applyCoupon() {
        const code = String(couponDraft || "").trim().toUpperCase();
        setAutoCouponMsg("");
        setLastAutoClearedCode("");
        setCouponDraft(code);
        setCouponCode(code);
    }

    function clearCoupon() {
        setAutoCouponMsg("");
        setLastAutoClearedCode("");
        setCouponDraft("");
        setCouponCode("");
    }

    const quoteMap = new Map();
    for (const it of (quote?.items || [])) {
        if (it?.productSlug) quoteMap.set(String(it.productSlug), it);
        if (it?.productId) quoteMap.set(String(it.productId), it);
        if (it?.productRef) quoteMap.set(String(it.productRef), it);
    }

    function getQuoteItemForCartRow(p) {
        const keys = [
            p?.id,
            p?.productId,
            p?._id,
            p?.productRef,
            p?.productSlug,
        ]
            .filter(Boolean)
            .map((x) => String(x));

        for (const k of keys) {
            const it = quoteMap.get(k);
            if (it) return it;
        }
        return null;
    }

    function handleCheckout() {
        if (!authUser) {
            navigate("/shop/login?next=/shop/cart");
            return;
        }
        navigate("/shop/checkout");
    }

    return (
        <div className="container py-4 shop-cart">
            <div className="d-flex align-items-center justify-content-between mb-4 shop-cart-header">
                <h1 className="mb-0">Carrello</h1>
                <Link to="/shop" className="btn btn-outline-light">
                    Torna allo shop
                </Link>
            </div>

            {productsError ? (
                <div className="alert alert-warning py-2">
                    Non riesco a caricare i prodotti. Alcuni dettagli potrebbero mancare.
                    <div className="text-muted" style={{ fontSize: 13 }}>{productsError}</div>
                </div>
            ) : null}

            {cart.length === 0 ? (
                <p>Il carrello è vuoto.</p>
            ) : (
                <>
                    <div className="list-group mb-4 shop-cart-list">
                        {cart.map((p) => {
                            const imgSrc = p.image || IMG_PLACEHOLDER;

                            const qi = getQuoteItemForCartRow(p);

                            const SET_PRODUCT_ID = "SET EXPERIENCE";
                            const SET_ID_NORM = SET_PRODUCT_ID.trim().toLowerCase();

                            const idKey = String(p?.id ?? "").trim().toLowerCase();
                            const nameKey = String(p?.name ?? "").trim().toLowerCase();

                            // set riconosciuto per id (e fallback sul nome)
                            const isSet =
                                idKey === SET_ID_NORM ||
                                nameKey.includes(SET_ID_NORM);

                            const qty = Number(p?.qty) || 1;

                            const forcedUnitCents = isSet ? (isPiva ? 5400 : 6000) : null;
                            const forcedLineCents = forcedUnitCents != null ? forcedUnitCents * qty : null;

                            const lineCents = forcedLineCents != null
                                ? forcedLineCents
                                : (Number.isFinite(Number(qi?.lineTotalCents))
                                    ? Number(qi.lineTotalCents)
                                    : (p.price !== "" && p.price != null ? toCents(p.price) * qty : null));

                            return (
                                <div key={p.id} className="list-group-item d-flex gap-3 align-items-center">
                                    <img
                                        key={imgSrc}
                                        src={imgSrc}
                                        alt={p.name || "Prodotto"}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            e.currentTarget.src = IMG_PLACEHOLDER;
                                        }}
                                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
                                    />

                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between">
                                            <strong>{p.name || "Prodotto"}</strong>

                                            {lineCents == null ? (
                                                <span className="text-muted">{productsLoading ? "…" : "—"}</span>
                                            ) : (
                                                <span>{formatEURFromCents(lineCents)}</span>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center gap-2 mt-2">
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => dec(p.id)}>
                                                -
                                            </button>

                                            <span style={{ minWidth: 28, textAlign: "center" }}>{p.qty}</span>

                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => inc(p.id)}>
                                                +
                                            </button>

                                            <button
                                                className="btn btn-outline-danger btn-sm ms-auto"
                                                onClick={() => removeFromCart(p.id)}
                                            >
                                                Rimuovi
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="card p-3 shop-cart-summary">
                        <div className="d-flex justify-content-between">
                            <span>Subtotale</span>
                            <strong>{formatEURFromCents(quote?.subtotalCents || 0)}</strong>
                        </div>

                        {globalDiscountCents > 0 ? (
                            <div className="d-flex justify-content-between mt-2">
                                <span>{globalDiscountLabel}</span>
                                <strong>- {formatEURFromCents(globalDiscountCents)}</strong>
                            </div>
                        ) : null}

                        {couponDiscountCents > 0 ? (
                            <div className="d-flex justify-content-between mt-2">
                                <span>Coupon{couponLabelCode ? ` ${couponLabelCode}` : ""}</span>
                                <strong>- {formatEURFromCents(couponDiscountCents)}</strong>
                            </div>
                        ) : null}

                        {(globalDiscountCents + couponDiscountCents) > 0 ? (
                            <div className="d-flex justify-content-between mt-2">
                                <span className="text-muted">Sconto totale</span>
                                <strong className="text-muted">- {formatEURFromCents(globalDiscountCents + couponDiscountCents)}</strong>
                            </div>
                        ) : null}

                        <hr />

                        <div className="d-flex justify-content-between">
                            <span>Totale</span>
                            <strong>{formatEURFromCents(totalNoShippingCents)}</strong>
                        </div>

                        <div className="mt-3 shop-coupon">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                                <label className="form-label m-0" style={{ fontSize: 15 }}>
                                    Codice sconto
                                </label>

                                {couponAppliedCode ? (
                                    <span className="shop-coupon__badge" title="Coupon applicato">
                                        <span className="shop-coupon__badge-label">Applicato:</span>
                                        <strong className="shop-coupon__badge-code">{couponAppliedCode}</strong>
                                        <button
                                            type="button"
                                            className="shop-coupon__badge-x"
                                            onClick={clearCoupon}
                                            disabled={quoteLoading}
                                            aria-label="Rimuovi coupon"
                                            title="Rimuovi coupon"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ) : null}
                            </div>

                            <div className="shop-coupon__group">
                                <input
                                    className="form-control shop-coupon__input"
                                    placeholder="Es. PROMO10"
                                    value={couponDraft}
                                    onChange={(e) => setCouponDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            applyCoupon();
                                        }
                                    }}
                                    disabled={quoteLoading}
                                    inputMode="text"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />

                                <button
                                    className="btn shop-coupon__btn shop-coupon__btn--apply"
                                    type="button"
                                    onClick={applyCoupon}
                                    disabled={quoteLoading}
                                >
                                    Applica
                                </button>

                                <button
                                    className="btn shop-coupon__btn shop-coupon__btn--reset"
                                    type="button"
                                    onClick={clearCoupon}
                                    disabled={quoteLoading}
                                >
                                    Reset
                                </button>
                            </div>

                            {autoCouponMsg ? (
                                <div className="shop-coupon__msg shop-coupon__msg--error">
                                    {autoCouponMsg}
                                </div>
                            ) : null}

                            {!autoCouponMsg && couponErrorMsg && !quoteLoading ? (
                                <div className="shop-coupon__msg shop-coupon__msg--error">
                                    {couponErrorMsg}
                                </div>
                            ) : null}

                            {!couponErrorMsg && couponAppliedCode && couponDiscountCents > 0 && !quoteLoading ? (
                                <div className="shop-coupon__msg shop-coupon__msg--success">
                                    Coupon <b>{couponAppliedCode}</b> applicato: - {formatEURFromCents(couponDiscountCents)}
                                </div>
                            ) : null}

                            {!couponErrorMsg && genericQuoteMsg ? (
                                <div className="shop-coupon__msg shop-coupon__msg--info">
                                    {genericQuoteMsg}
                                </div>
                            ) : null}

                            {!authUser ? (
                                <div className="shop-coupon__hint">
                                    Il coupon verrà verificato dopo l’accesso (il quote richiede login).
                                </div>
                            ) : null}

                            {quoteLoading ? (
                                <div className="shop-coupon__hint">
                                    Verifica coupon in corso…
                                </div>
                            ) : null}
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-3">
                            {!authUser ? (
                                <Link to="/shop/login?next=/shop/cart" className="btn shop-btn-primary">
                                    Accedi per continuare
                                </Link>
                            ) : (
                                <button className="btn shop-btn-primary" type="button" onClick={handleCheckout}>
                                    Checkout
                                </button>
                            )}
                        </div>

                        <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                            Articoli: {totals.items}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
