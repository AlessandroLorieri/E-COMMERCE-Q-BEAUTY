import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toCents } from "../utils/money";
import { useAuth } from "./AuthContext";

const ShopContext = createContext(null);

const CART_KEY = "qbeauty_shop_cart_v3";

function getCouponStorageKey(cartKey) {
    return `${cartKey}:coupon`;
}

function hydrateCouponFromStorage(key, storage) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return "";
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === "string" ? parsed : String(raw);
        } catch {
            return String(raw);
        }
    } catch {
        return "";
    }
}

function normalizeId(x) {
    return x == null ? "" : String(x);
}

function getCartStorageKey(user) {
    const id = user?.id || user?._id || user?.email;
    return `${CART_KEY}:${id || "guest"}`;
}

function getCartStorage(user, loading) {
    if (loading || !user) return sessionStorage;
    return localStorage;
}

function hydrateCartFromStorage(key, storage) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return [];
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved)) return [];
        return saved
            .map((item) => {
                const id = normalizeId(item?.id);
                const qty = Math.max(1, Number(item?.qty) || 1);
                if (!id) return null;
                return { id, qty };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function pickProductId(p) {
    return normalizeId(p?._id || p?.id);
}

function extractProductsList(data) {
    if (Array.isArray(data)) return data;
    return data?.products || data?.items || data?.data || [];
}

function isProductActive(p) {
    if (typeof p?.isActive === "boolean") return p.isActive;
    if (typeof p?.active === "boolean") return p.active;
    if (typeof p?.enabled === "boolean") return p.enabled;
    if (typeof p?.disabled === "boolean") return !p.disabled;

    if (typeof p?.status === "string") {
        const s = p.status.toLowerCase();
        if (["inactive", "disabled", "draft", "archived", "deleted"].includes(s)) return false;
        if (["active", "published", "public"].includes(s)) return true;
    }

    return true;
}

function normalizeProductFromApi(p) {
    const mongoId = p?._id ? String(p._id) : "";
    const legacyId = p?.id != null ? String(p.id) : "";
    const id = mongoId || legacyId;
    if (!id) return null;

    const priceCents =
        Number(p?.priceCents ?? p?.unitPriceCents ?? p?.amountCents ?? p?.price_in_cents) ||
        (p?.price != null && p?.price !== "" ? toCents(p.price) : 0);

    const price = p?.price != null && p?.price !== "" ? p.price : priceCents / 100;

    const image =
        p?.image ||
        p?.imageUrl ||
        p?.cover ||
        p?.coverUrl ||
        p?.thumbnail ||
        (Array.isArray(p?.images) && p.images[0]) ||
        (Array.isArray(p?.gallery) && p.gallery[0]) ||
        "";

    return {
        ...p,
        id,                 
        _id: mongoId || p?._id,
        legacyId,
        priceCents,
        price,
        image,
        __active: isProductActive(p),
    };
}

function mergeCartLines(lines) {
    const m = new Map();
    for (const x of lines) {
        const id = normalizeId(x?.id);
        const qty = Math.max(1, Number(x?.qty) || 1);
        if (!id) continue;
        m.set(id, (m.get(id) || 0) + qty);
    }
    return Array.from(m.entries()).map(([id, qty]) => ({ id, qty }));
}

export function ShopProvider({ children }) {
    const { user, token, loading, logout: authLogout } = useAuth();
    const apiBase = import.meta.env.VITE_API_URL;

    const cartKey = useMemo(() => getCartStorageKey(loading ? null : user), [
        loading,
        user?.id,
        user?._id,
        user?.email,
    ]);

    const cartStorage = useMemo(() => getCartStorage(loading ? null : user, loading), [
        loading,
        user?.id,
        user?._id,
        user?.email,
    ]);

    const couponKey = useMemo(() => getCouponStorageKey(cartKey), [cartKey]);

    const [couponCode, setCouponCode] = useState(() =>
        hydrateCouponFromStorage(getCouponStorageKey(getCartStorageKey(null)), sessionStorage)
    );

    const skipPersistCouponRef = useRef(false);
    const prevCouponKeyRef = useRef(couponKey);

    useEffect(() => {
        const next = hydrateCouponFromStorage(couponKey, cartStorage);

        setCouponCode((prev) => {
            const prevKey = prevCouponKeyRef.current;

            const prevWasGuest = String(prevKey).includes(":guest");
            const nextIsUser = !String(couponKey).includes(":guest");

            if (prevWasGuest && nextIsUser && !next && prev) {
                try {
                    cartStorage.setItem(couponKey, prev);
                } catch { }
                return prev;
            }

            return next || "";
        });

        prevCouponKeyRef.current = couponKey;
        skipPersistCouponRef.current = true;
    }, [couponKey, cartStorage]);

    useEffect(() => {
        if (skipPersistCouponRef.current) {
            skipPersistCouponRef.current = false;
            return;
        }

        try {
            const v = String(couponCode || "").trim();
            if (!v) cartStorage.removeItem(couponKey);
            else cartStorage.setItem(couponKey, v);
        } catch { }
    }, [couponCode, couponKey, cartStorage]);

    // PRODUCTS
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState("");

    useEffect(() => {
        let alive = true;

        async function fetchProducts() {
            if (!apiBase) return;

            setProductsLoading(true);
            setProductsError("");

            const candidates = [
                `${apiBase}/api/products`,
                `${apiBase}/api/products/public`,
                `${apiBase}/api/products/shop`,
            ];

            let lastErr = null;

            for (const url of candidates) {
                try {
                    const res = await fetch(url, { credentials: "include" });
                    const data = await res.json().catch(() => ({}));

                    if (!res.ok) throw new Error(data?.message || `Errore prodotti (${res.status})`);

                    const list = extractProductsList(data);
                    const normalized = (list || []).map(normalizeProductFromApi).filter(Boolean);

                    if (!alive) return;
                    setProducts(normalized);
                    setProductsLoading(false);
                    return;
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!alive) return;
            setProducts([]);
            setProductsError(lastErr?.message || "Errore caricamento prodotti");
            setProductsLoading(false);
        }

        fetchProducts();
        return () => {
            alive = false;
        };
    }, [apiBase]);

    const productsById = useMemo(() => {
        const m = new Map();
        for (const p of products) {
            const a = normalizeId(p?.id);
            const b = normalizeId(p?._id);
            const c = normalizeId(p?.legacyId);
            if (a) m.set(a, p);
            if (b) m.set(b, p);
            if (c) m.set(c, p);
        }
        return m;
    }, [products]);

    function resolveToMongoId(anyId) {
        const id = normalizeId(anyId);
        if (!id) return "";
        const p = productsById.get(id);
        return normalizeId(p?._id || p?.id || id);
    }

    function isCartLineValid(line) {
        const id = normalizeId(line?.id);
        const p = productsById.get(id);
        return !!p && p.__active === true;
    }

    // CART 
    const [cartRaw, setCartRaw] = useState(() =>
        hydrateCartFromStorage(getCartStorageKey(null), sessionStorage)
    );

    const skipPersistRef = useRef(false);
    const prevCartKeyRef = useRef(cartKey);

    useEffect(() => {
        const next = hydrateCartFromStorage(cartKey, cartStorage);

        setCartRaw((prev) => {
            const prevKey = prevCartKeyRef.current;

            const prevWasGuest = String(prevKey).endsWith(":guest");
            const nextIsUser = !String(cartKey).endsWith(":guest");

            if (prevWasGuest && nextIsUser && next.length === 0 && prev.length > 0) {
                try {
                    cartStorage.setItem(cartKey, JSON.stringify(prev));
                } catch { }
                return prev;
            }

            return next;
        });

        prevCartKeyRef.current = cartKey;
        skipPersistRef.current = true;
    }, [cartKey, cartStorage]);

    useEffect(() => {
        if (skipPersistRef.current) {
            skipPersistRef.current = false;
            return;
        }
        try {
            cartStorage.setItem(cartKey, JSON.stringify(cartRaw));
        } catch { }
    }, [cartRaw, cartKey, cartStorage]);

    useEffect(() => {
        if (productsLoading) return;
        if (!products.length) return;
        if (!cartRaw.length) return;

        setCartRaw((prev) => {
            const migrated = prev.map((x) => ({ ...x, id: resolveToMongoId(x.id) }));
            const merged = mergeCartLines(migrated);

            const same =
                merged.length === prev.length &&
                merged.every((x, i) => x.id === prev[i].id && x.qty === prev[i].qty);

            return same ? prev : merged;
        });
    }, [productsLoading, products.length]);

    const cart = useMemo(() => {
        return cartRaw.map((line) => {
            const id = normalizeId(line.id);
            const prod = productsById.get(id);

            if (!prod) {
                return { id, qty: line.qty, name: "Prodotto", price: "", image: "", priceCents: 0 };
            }

            return {
                ...prod,
                id: normalizeId(prod._id || prod.id),
                qty: line.qty,
            };
        });
    }, [cartRaw, productsById]);

    // CART ACTIONS
    function addToCart(product) {
        const id = resolveToMongoId(pickProductId(product));
        if (!id) return;

        setCartRaw((prev) => {
            const found = prev.find((x) => normalizeId(x.id) === id);
            if (found) return prev.map((x) => (normalizeId(x.id) === id ? { ...x, qty: x.qty + 1 } : x));
            return [...prev, { id, qty: 1 }];
        });
    }

    function addToCartQty(product, qty) {
        const id = resolveToMongoId(pickProductId(product));
        if (!id) return;
        const q = Math.max(1, Number(qty) || 1);

        setCartRaw((prev) => {
            const found = prev.find((x) => normalizeId(x.id) === id);
            if (found) return prev.map((x) => (normalizeId(x.id) === id ? { ...x, qty: x.qty + q } : x));
            return [...prev, { id, qty: q }];
        });
    }

    function inc(productId) {
        const id = normalizeId(productId);
        setCartRaw((prev) => prev.map((x) => (normalizeId(x.id) === id ? { ...x, qty: x.qty + 1 } : x)));
    }

    function dec(productId) {
        const id = normalizeId(productId);
        setCartRaw((prev) =>
            prev.map((x) => (normalizeId(x.id) === id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
        );
    }

    function removeFromCart(productId) {
        const id = normalizeId(productId);
        setCartRaw((prev) => prev.filter((x) => normalizeId(x.id) !== id));
    }

    function clearCart() {
        setCartRaw([]);
    }

    // TOTALS
    const totals = useMemo(() => {
        const items = cartRaw.reduce((sum, x) => sum + x.qty, 0);
        const amountCents = cartRaw.reduce((sum, x) => {
            const p = productsById.get(normalizeId(x.id));
            const unit = p ? Number(p.priceCents) || 0 : 0;
            return sum + unit * x.qty;
        }, 0);
        return { items, amountCents };
    }, [cartRaw, productsById]);

    // QUOTE
    const [quote, setQuote] = useState(() => ({
        subtotalCents: totals.amountCents,
        discountCents: 0,
        discountLabel: null,
        shippingCents: null,
        totalCents: totals.amountCents,
    }));
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState("");
    const [quoteErrors, setQuoteErrors] = useState({});

    useEffect(() => {
        if (!cartRaw.length) {
            setQuote({
                subtotalCents: 0,
                discountCents: 0,
                discountLabel: null,
                shippingCents: null,
                totalCents: 0,
            });
            setQuoteLoading(false);
            setQuoteError("");
            setQuoteErrors({});
            return;
        }

        if (!user || !token) {
            const subtotalCents = totals.amountCents;
            setQuote({
                subtotalCents,
                discountCents: 0,
                discountLabel: null,
                shippingCents: null,
                totalCents: subtotalCents,
            });
            setQuoteLoading(false);
            setQuoteError("");
            setQuoteErrors({});
            return;
        }

        if (productsLoading) return;
        if (!products.length) return;

        const validItems = cartRaw
            .map(x => ({
                productId: normalizeId(x.id),
                qty: x.qty
            }))
            .filter(x => productsById.has(x.productId));

        if (!validItems.length) return;

        const controller = new AbortController();

        async function fetchQuote() {
            try {
                setQuoteLoading(true);

                const res = await fetch(`${apiBase}/api/orders/quote`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        items: validItems,
                        ...(couponCode && String(couponCode).trim() ? { couponCode: String(couponCode).trim() } : {}),
                    }),
                    signal: controller.signal,
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    const msg =
                        data?.errors?.couponCode ||
                        data?.message ||
                        "Quote failed";

                    setQuoteError(msg);
                    setQuoteErrors((data && typeof data.errors === "object") ? data.errors : {});

                    return;
                }

                const bd = (data && typeof data.discountBreakdown === "object") ? data.discountBreakdown : {};

                const couponDiscountCents =
                    Number(data?.couponDiscountCents ?? bd?.couponDiscountCents) || 0;

                const globalDiscountCents =
                    Number(data?.globalDiscountCents ?? bd?.globalDiscountCents) || 0;

                setQuoteError("");
                setQuoteErrors({});
                setQuote({
                    items: Array.isArray(data.items) ? data.items : [],
                    subtotalCents: Number(data.subtotalCents) || 0,
                    discountCents: Number(data.discountCents) || 0,
                    discountLabel: data.discountLabel ?? null,
                    shippingCents: Number.isFinite(Number(data.shippingCents)) ? Number(data.shippingCents) : null,
                    totalCents: Number.isFinite(Number(data.totalCents))
                        ? Number(data.totalCents)
                        : Math.max(0, (Number(data.subtotalCents) || 0) - (Number(data.discountCents) || 0)),
                    discountType: data.discountType || "none",

                    couponCodeApplied: data.couponCodeApplied || null,
                    couponDiscountCents,
                    globalDiscountCents,

                    discountBreakdown: { couponDiscountCents, globalDiscountCents },
                });

            } catch (err) {
                if (err.name !== "AbortError") {
                    setQuoteError(err.message || "Errore quote");
                    setQuoteErrors({});
                }
            } finally {
                setQuoteLoading(false);
            }
        }

        fetchQuote();

        return () => controller.abort();
    }, [
        apiBase,
        cartRaw,
        totals.amountCents,
        user,
        token,
        couponCode,
        productsLoading,
        products.length
    ]);

    // ORDERS / ADDRESSES
    async function createOrder(payload) {
        if (!token) throw new Error("Non autenticato");

        const items = cartRaw
            .filter(isCartLineValid)
            .map((x) => ({ productId: resolveToMongoId(x.id), qty: x.qty }));

        const res = await fetch(`${apiBase}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                items,
                ...(payload || {}),
                ...(couponCode && String(couponCode).trim() ? { couponCode: String(couponCode).trim() } : {}),
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data?.message || "Errore creazione ordine");
            err.details = data;
            throw err;
        }
        return data;
    }

    async function fetchMyOrders() {
        if (!token) throw new Error("Non autenticato");
        const res = await fetch(`${apiBase}/api/orders/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Errore caricamento ordini");
        return data.orders || [];
    }

    async function fetchMyAddresses() {
        if (!token) throw new Error("Non autenticato");
        const res = await fetch(`${apiBase}/api/addresses/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Errore caricamento indirizzi");
        return data.addresses || [];
    }

    async function createAddress(payload) {
        if (!token) throw new Error("Non autenticato");
        const res = await fetch(`${apiBase}/api/addresses`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data?.message || "Creazione indirizzo fallita");
            err.details = data;
            throw err;
        }
        return data.address;
    }

    async function setDefaultAddress(addressId) {
        if (!token) throw new Error("Non autenticato");
        const res = await fetch(`${apiBase}/api/addresses/${addressId}/default`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data?.message || "Impostazione indirizzo default fallita");
            err.details = data;
            throw err;
        }
        return data.addresses || data.address || null;
    }

    const value = useMemo(
        () => ({
            products,
            productsLoading,
            productsError,
            cart,
            addToCart,
            addToCartQty,
            inc,
            dec,
            removeFromCart,
            clearCart,
            totals,
            quote,
            quoteLoading,
            quoteError,
            quoteErrors,
            couponCode,
            setCouponCode,
            createOrder,
            fetchMyOrders,
            fetchMyAddresses,
            createAddress,
            setDefaultAddress,

            user,
            logout: authLogout,
        }),
        [products, productsLoading, productsError, cart, totals, quote, quoteLoading, quoteError, quoteErrors, couponCode, user, authLogout]

    );

    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
    const ctx = useContext(ShopContext);
    if (!ctx) throw new Error("useShop deve essere usato dentro <ShopProvider />");
    return ctx;
}
