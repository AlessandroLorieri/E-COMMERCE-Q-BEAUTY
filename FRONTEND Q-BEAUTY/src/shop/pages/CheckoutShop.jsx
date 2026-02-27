import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { toCents, formatEURFromCents } from "../utils/money";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandSpinner from "../components/BrandSpinner";

import "./CheckoutShop.css";

export default function CheckoutShop() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {
        cart,
        quote,
        clearCart,
        createOrder,
        quoteLoading,
        quoteError,
        fetchMyAddresses,
        createAddress,
    } = useShop();

    const { user, loading, token } = useAuth();
    const apiBase = useMemo(
        () => String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, ""),
        []
    );

    const [form, setForm] = useState({
        name: "",
        surname: "",
        taxCode: "",
        phone: "",
        address: "",
        streetNumber: "",
        city: "",
        cap: "",
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [paying, setPaying] = useState(false);
    const [banking, setBanking] = useState(false);

    const [paymentNotice, setPaymentNotice] = useState("");
    const [retryOrderId, setRetryOrderId] = useState("");

    const [addresses, setAddresses] = useState([]);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [addressMode, setAddressMode] = useState("new");
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const [saveToAddressBook, setSaveToAddressBook] = useState(true);
    const [addressLabel, setAddressLabel] = useState("Casa");

    useEffect(() => {
        if (loading) return;
        if (!user) navigate("/shop/login?next=/shop/checkout", { replace: true });
    }, [user, loading, navigate]);

    useEffect(() => {
        const canceled = searchParams.get("canceled");
        const oid = searchParams.get("orderId");

        if (canceled === "1") {
            setPaymentNotice("Pagamento annullato. Puoi riprovare quando vuoi.");
            if (oid) setRetryOrderId(oid);
        } else {
            setPaymentNotice("");
            setRetryOrderId("");
        }
    }, [searchParams]);

    useEffect(() => {
        let alive = true;

        async function loadAddresses() {
            if (loading) return;
            if (!user) return;

            setAddressesLoading(true);
            try {
                const list = await fetchMyAddresses();
                if (!alive) return;

                setAddresses(list);

                if (list.length > 0) {
                    const def = list.find((a) => a.isDefault) || list[0];
                    setSelectedAddressId(def?._id || "");
                    setAddressMode("saved");

                    setForm((prev) => ({
                        ...prev,
                        name: def.name || prev.name,
                        surname: def.surname || prev.surname,
                        taxCode: prev.taxCode,
                        phone: def.phone || prev.phone,
                        address: def.address || prev.address,
                        streetNumber: def.streetNumber || prev.streetNumber,
                        city: def.city || prev.city,
                        cap: def.cap || prev.cap,
                    }));
                } else {
                    setAddressMode("new");
                }
            } catch (err) {
                console.error("fetchMyAddresses error:", err);
            } finally {
                if (!alive) return;
                setAddressesLoading(false);
            }
        }

        loadAddresses();

        return () => {
            alive = false;
        };
    }, [user, loading, fetchMyAddresses]);

    function handleSelectSaved(id) {
        setSelectedAddressId(id);

        const a = addresses.find((x) => x._id === id);
        if (!a) return;

        setForm((prev) => ({
            ...prev,
            name: a.name || "",
            surname: a.surname || "",
            taxCode: prev.taxCode,
            phone: a.phone || "",
            address: a.address || "",
            streetNumber: a.streetNumber || "",
            city: a.city || "",
            cap: a.cap || "",
        }));

        setFieldErrors({});
        setSubmitError("");
    }

    function switchToNew() {
        setAddressMode("new");
        setSelectedAddressId("");
        setForm((prev) => ({
            ...prev,
            name: "",
            surname: "",
            taxCode: prev.taxCode,
            phone: "",
            address: "",
            streetNumber: "",
            city: "",
            cap: "",
        }));
        setFieldErrors({});
        setSubmitError("");
    }

    function onChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setSubmitError("");

        setFieldErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }

    function normalizeTaxCode(v) {
        return String(v || "").trim().toUpperCase();
    }

    function validateClient() {
        const e = {};
        if (!form.name.trim()) e.name = "Nome richiesto";
        if (!form.surname.trim()) e.surname = "Cognome richiesto";

        const tc = String(form.taxCode || "").trim().toUpperCase();
        if (!tc) e.taxCode = "Codice Fiscale richiesto";
        else if (!(/^[A-Z0-9]{16}$/.test(tc) || /^\d{11}$/.test(tc))) {
            e.taxCode = "Codice Fiscale non valido (16 caratteri o 11 cifre)";
        }

        if (!form.phone.trim()) e.phone = "Telefono richiesto";
        else {
            const digits = form.phone.replace(/[^\d]/g, "");
            if (digits.length < 7 || digits.length > 15) e.phone = "Telefono non valido";
        }

        if (!form.address.trim()) e.address = "Indirizzo richiesto";
        if (!form.streetNumber.trim()) e.streetNumber = "N° civico richiesto";
        if (!form.city.trim()) e.city = "Città richiesta";

        if (!form.cap.trim()) e.cap = "CAP richiesto";
        else if (!/^\d{5}$/.test(form.cap.trim())) e.cap = "CAP non valido (5 cifre)";

        return e;
    }

    async function fetchMyOrdersRaw() {
        if (!apiBase) throw new Error("VITE_API_URL non configurata");
        if (!token) throw new Error("Token mancante: riesegui login");

        const res = await fetch(`${apiBase}/api/orders/me`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Errore lettura ordini");
        return data?.orders || [];
    }

    async function resolveOrderIdFromCreateOrderResponse(created) {
        const direct =
            created?._id ||
            created?.id ||
            created?.orderId ||
            created?.order?._id ||
            created?.order?.id;

        if (direct) return String(direct);

        const publicId = created?.publicId || created?.order?.publicId;
        if (!publicId) return null;

        const orders = await fetchMyOrdersRaw();
        const found = Array.isArray(orders)
            ? orders.find((o) => String(o.publicId) === String(publicId))
            : null;

        return found?._id ? String(found._id) : null;
    }

    async function createStripeCheckoutSession(orderId) {
        if (!apiBase) throw new Error("VITE_API_URL non configurata");
        if (!token) throw new Error("Token mancante: riesegui login");

        const res = await fetch(`${apiBase}/api/payments/stripe/checkout-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({ orderId }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Errore creazione sessione Stripe");
        if (!data?.url) throw new Error("Stripe non ha restituito la URL di checkout");
        return data.url;
    }

    async function startStripePayment(orderId) {
        setPaying(true);
        setSubmitError("");
        try {
            const url = await createStripeCheckoutSession(orderId);

            clearCart();

            window.location.assign(url);
        } catch (err) {
            setSubmitError(err?.message || "Errore avvio pagamento");
            setPaying(false);
        }
    }

    async function confirmOrderAndPay() {
        if (!cart.length) {
            setSubmitError("Il carrello è vuoto.");
            return;
        }

        if (!(addressMode === "saved" && selectedAddressId)) {
            const e = validateClient();
            setFieldErrors(e);
            if (Object.keys(e).length) {
                setSubmitError("Controlla i campi evidenziati.");
                return;
            }
        } else {
            setFieldErrors({});
        }

        setSubmitting(true);
        setSubmitError("");

        try {
            const taxCode = normalizeTaxCode(form.taxCode);

            const payload = {
                name: form.name.trim(),
                surname: form.surname.trim(),
                taxCode,
                phone: form.phone.trim(),
                email: user?.email || "",
                address: form.address.trim(),
                streetNumber: form.streetNumber.trim(),
                city: form.city.trim(),
                cap: form.cap.trim(),
            };

            let created;

            if (addressMode === "saved" && selectedAddressId) {
                created = await createOrder({ shippingAddressId: selectedAddressId, taxCode });
            } else {
                if (saveToAddressBook) {
                    const saved = await createAddress({ label: addressLabel.trim(), ...payload });
                    created = await createOrder({ shippingAddressId: saved._id, taxCode });
                } else {
                    created = await createOrder({ shippingAddress: payload, taxCode });
                }
            }

            const orderId = await resolveOrderIdFromCreateOrderResponse(created);
            if (!orderId) {
                throw new Error("createOrder non ha restituito _id e non riesco a risalire all’ordine via publicId.");
            }

            await startStripePayment(orderId);
        } catch (err) {
            const ship = err?.details?.shippingAddress;
            if (ship && typeof ship === "object") {
                setFieldErrors((prev) => ({ ...prev, ...ship }));
                setSubmitError("Validazione backend: controlla i campi.");
            } else {
                setSubmitError(err?.message || "Errore creazione ordine");
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function confirmOrderBankTransfer() {
        if (!cart.length) {
            setSubmitError("Il carrello è vuoto.");
            return;
        }

        if (!(addressMode === "saved" && selectedAddressId)) {
            const e = validateClient();
            setFieldErrors(e);
            if (Object.keys(e).length) {
                setSubmitError("Controlla i campi evidenziati.");
                return;
            }
        } else {
            setFieldErrors({});
        }

        setSubmitting(true);
        setBanking(true);
        setSubmitError("");

        try {
            const taxCode = normalizeTaxCode(form.taxCode);

            const payload = {
                name: form.name.trim(),
                surname: form.surname.trim(),
                taxCode,
                phone: form.phone.trim(),
                email: user?.email || "",
                address: form.address.trim(),
                streetNumber: form.streetNumber.trim(),
                city: form.city.trim(),
                cap: form.cap.trim(),
            };

            let created;

            if (addressMode === "saved" && selectedAddressId) {
                created = await createOrder({ shippingAddressId: selectedAddressId, taxCode });
            } else {
                if (saveToAddressBook) {
                    const saved = await createAddress({ label: addressLabel.trim(), ...payload });
                    created = await createOrder({ shippingAddressId: saved._id, taxCode });
                } else {
                    created = await createOrder({ shippingAddress: payload, taxCode });
                }
            }

            const orderId = await resolveOrderIdFromCreateOrderResponse(created);
            if (!orderId) {
                throw new Error("createOrder non ha restituito _id e non riesco a risalire all’ordine via publicId.");
            }

            clearCart();
            navigate(`/shop/order-success/${encodeURIComponent(orderId)}?pay=bank`, { replace: true });
        } catch (err) {
            const ship = err?.details?.shippingAddress;
            if (ship && typeof ship === "object") {
                setFieldErrors((prev) => ({ ...prev, ...ship }));
                setSubmitError("Validazione backend: controlla i campi.");
            } else {
                setSubmitError(err?.message || "Errore creazione ordine");
            }
        } finally {
            setSubmitting(false);
            setBanking(false);
        }
    }


    if (loading) return <BrandSpinner text="Sto preparando il checkout..." />;
    if (!user) return <BrandSpinner text="Ti porto alla pagina di accesso..." />;

    const busy = submitting || paying || banking;

    return (
        <div className="container py-4 shop-checkout" style={{ maxWidth: 820 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="mb-0">Checkout</h1>
                <Link to="/shop/cart" className="btn btn-outline-light">
                    Torna al carrello
                </Link>
            </div>

            <div className="row g-4">
                {/* Colonna sinistra: form */}
                <div className="col-12 col-lg-7">
                    <div className="card p-3">
                        <h5>Dati spedizione</h5>

                        <div className="mb-3">
                            <label className="form-label">Indirizzo di spedizione</label>

                            {addressesLoading ? (
                                <div className="text-muted" style={{ fontSize: 13 }}>
                                    Carico indirizzi...
                                </div>
                            ) : addresses.length > 0 ? (
                                <>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            id="addrSaved"
                                            checked={addressMode === "saved"}
                                            onChange={() => {
                                                setAddressMode("saved");
                                                const id = selectedAddressId || (addresses[0]?._id ?? "");
                                                if (id) handleSelectSaved(id);
                                            }}
                                            disabled={busy}
                                        />
                                        <label className="form-check-label" htmlFor="addrSaved">
                                            Usa un indirizzo salvato
                                        </label>
                                    </div>

                                    {addressMode === "saved" && (
                                        <>
                                            <select
                                                className="form-select mt-2"
                                                value={selectedAddressId}
                                                onChange={(e) => handleSelectSaved(e.target.value)}
                                                disabled={busy}
                                            >
                                                {addresses.map((a) => {
                                                    const civic = a.streetNumber ? `, ${a.streetNumber}` : "";
                                                    return (
                                                        <option key={a._id} value={a._id}>
                                                            {a.address}{civic}, {a.city} ({a.cap})
                                                        </option>
                                                    );
                                                })}

                                            </select>

                                            <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                                                Dati compilati automaticamente dall’indirizzo salvato.
                                            </div>
                                        </>

                                    )}

                                    <div className="form-check mt-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            id="addrNew"
                                            checked={addressMode === "new"}
                                            onChange={switchToNew}
                                            disabled={busy}
                                        />
                                        <label className="form-check-label" htmlFor="addrNew">
                                            Inserisci un nuovo indirizzo
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted" style={{ fontSize: 13 }}>
                                    Nessun indirizzo salvato. Inserisci un nuovo indirizzo qui sotto.
                                </div>
                            )}
                        </div>

                        {addressMode === "new" && (
                            <div className="mb-3">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="saveAddr"
                                        checked={saveToAddressBook}
                                        onChange={(e) => setSaveToAddressBook(e.target.checked)}
                                        disabled={busy}
                                    />
                                    <label className="form-check-label" htmlFor="saveAddr">
                                        Salva questo indirizzo per i prossimi acquisti
                                    </label>
                                </div>
                            </div>
                        )}

                        {submitError && (
                            <div className="alert alert-danger py-2" role="alert">
                                {submitError}
                            </div>
                        )}

                        <div className="row g-2">
                            <div className="col-12 col-md-6">
                                <label className="form-label">Nome</label>
                                <input
                                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                                    name="name"
                                    value={form.name}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label">Cognome</label>
                                <input
                                    className={`form-control ${fieldErrors.surname ? "is-invalid" : ""}`}
                                    name="surname"
                                    value={form.surname}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.surname && <div className="invalid-feedback">{fieldErrors.surname}</div>}
                            </div>

                            <div className="col-12">
                                <label className="form-label">Codice Fiscale (per fattura)</label>
                                <input
                                    className={`form-control ${fieldErrors.taxCode ? "is-invalid" : ""}`}
                                    name="taxCode"
                                    value={form.taxCode}
                                    onChange={onChange}
                                    disabled={busy}
                                    placeholder="Es. RSSMRA80A01H501U"
                                    autoCapitalize="characters"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    inputMode="text"
                                />
                                {fieldErrors.taxCode && <div className="invalid-feedback">{fieldErrors.taxCode}</div>}
                                {!fieldErrors.taxCode ? (
                                    <div className="form-text">16 caratteri (persona fisica) oppure 11 cifre (azienda).</div>
                                ) : null}
                            </div>

                            <div className="col-12">
                                <label className="form-label">Telefono</label>
                                <input
                                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                                    name="phone"
                                    value={form.phone}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                            </div>

                            <div className="col-12">
                                <label className="form-label">Indirizzo</label>
                                <input
                                    className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`}
                                    name="address"
                                    value={form.address}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.address && <div className="invalid-feedback">{fieldErrors.address}</div>}
                            </div>

                            <div className="col-12 col-md-3">
                                <label className="form-label">N° civico</label>
                                <input
                                    className={`form-control ${fieldErrors.streetNumber ? "is-invalid" : ""}`}
                                    name="streetNumber"
                                    value={form.streetNumber}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.streetNumber && <div className="invalid-feedback">{fieldErrors.streetNumber}</div>}
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label">Città</label>
                                <input
                                    className={`form-control ${fieldErrors.city ? "is-invalid" : ""}`}
                                    name="city"
                                    value={form.city}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.city && <div className="invalid-feedback">{fieldErrors.city}</div>}
                            </div>

                            <div className="col-12 col-md-3">
                                <label className="form-label">CAP</label>
                                <input
                                    className={`form-control ${fieldErrors.cap ? "is-invalid" : ""}`}
                                    name="cap"
                                    value={form.cap}
                                    onChange={onChange}
                                    disabled={busy || (addressMode === "saved" && selectedAddressId)}
                                />
                                {fieldErrors.cap && <div className="invalid-feedback">{fieldErrors.cap}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colonna destra: riepilogo */}
                <div className="col-12 col-lg-5">
                    <div className="card p-3">
                        <h5>Riepilogo</h5>

                        {paymentNotice && (
                            <div className="alert alert-warning py-2 mb-2">
                                {paymentNotice}
                                {retryOrderId ? (
                                    <div className="mt-2 d-flex gap-2">
                                        <button
                                            className="btn btn-outline-light btn-sm"
                                            onClick={() => startStripePayment(retryOrderId)}
                                            disabled={busy}
                                        >
                                            {paying ? "Apro Stripe..." : "Riprova pagamento"}
                                        </button>
                                        <Link className="btn btn-outline-light btn-sm" to="/shop/orders">
                                            Vai ai miei ordini
                                        </Link>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {quoteLoading && <div className="alert alert-secondary py-2 mb-2">Calcolo sconto...</div>}
                        {quoteError && <div className="alert alert-warning py-2 mb-2">{quoteError}</div>}

                        <div className="mt-2" style={{ fontSize: 14 }}>
                            {cart.map((p) => {
                                const lineTotalCents = toCents(p.price) * p.qty;
                                return (
                                    <div key={p.id} className="d-flex justify-content-between">
                                        <span>
                                            {p.name} × {p.qty}
                                        </span>
                                        <span>{formatEURFromCents(lineTotalCents)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <hr />

                        {(() => {
                            const subtotalCents = quote?.subtotalCents ?? 0;
                            const discountCents = quote?.discountCents ?? 0;
                            const discountedTotalCents = Math.max(0, subtotalCents - discountCents);
                            const thresholdCents = 12000;

                            const shippingCents =
                                discountedTotalCents <= 0 ? 0 : discountedTotalCents >= thresholdCents ? 0 : 700;

                            const totalCents = discountedTotalCents + shippingCents;

                            const remainingCents =
                                shippingCents === 0 ? 0 : Math.max(0, thresholdCents - discountedTotalCents);

                            return (
                                <>
                                    <div className="d-flex justify-content-between">
                                        <span>Subtotale prodotti</span>
                                        <strong>{formatEURFromCents(subtotalCents)}</strong>
                                    </div>

                                    <div className="d-flex justify-content-between mt-2">
                                        <span>Sconto{quote?.discountLabel ? ` (${quote.discountLabel})` : ""}</span>
                                        <strong>{discountCents > 0 ? `- ${formatEURFromCents(discountCents)}` : "—"}</strong>
                                    </div>

                                    <div className="d-flex justify-content-between mt-2">
                                        <span>Totale dopo sconto</span>
                                        <strong>{formatEURFromCents(discountedTotalCents)}</strong>
                                    </div>

                                    <div className="d-flex justify-content-between mt-2">
                                        <span>Spedizione</span>
                                        <strong>{shippingCents === 0 ? "Gratis" : formatEURFromCents(shippingCents)}</strong>
                                    </div>

                                    {shippingCents > 0 && remainingCents > 0 ? (
                                        <div className="mt-1 text-warning" style={{ fontSize: 13 }}>
                                            Ti mancano <strong>{formatEURFromCents(remainingCents)}</strong> per ottenere la spedizione gratuita.
                                        </div>
                                    ) : shippingCents === 0 ? (
                                        <div className="mt-1 text-success" style={{ fontSize: 13 }}>
                                            Spedizione gratuita attiva ✅
                                        </div>
                                    ) : null}

                                    <hr />

                                    <div className="d-flex justify-content-between">
                                        <span>Totale ordine</span>
                                        <strong>{formatEURFromCents(totalCents)}</strong>
                                    </div>
                                </>
                            );
                        })()}

                        <button className="btn btn-primary mt-3" onClick={confirmOrderAndPay} disabled={busy}>
                            {submitting ? "Creo ordine..." : paying ? "Apro Stripe..." : "Conferma e paga"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-outline-light mt-2 w-100"
                            onClick={confirmOrderBankTransfer}
                            disabled={busy}
                        >
                            {banking ? "Creo l’ordine..." : "Paga con bonifico"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
