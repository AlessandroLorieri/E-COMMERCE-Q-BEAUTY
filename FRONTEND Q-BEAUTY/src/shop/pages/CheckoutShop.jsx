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
        fetchMyOrders,
        createAddress,
    } = useShop();


    const { user, loading, authFetch } = useAuth();

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
                        taxCode: normalizeTaxCode(prev.taxCode || def.taxCode || def.codiceFiscale || def.fiscalCode || ""),
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
            taxCode: normalizeTaxCode(prev.taxCode || a.taxCode || a.codiceFiscale || a.fiscalCode || ""),
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

    function isValidCodiceFiscale(cfRaw) {
        const cf = normalizeTaxCode(cfRaw);

        // 16 caratteri, lettere o numeri (omocodia inclusa)
        if (!/^[A-Z0-9]{16}$/.test(cf)) return false;

        // tabelle ufficiali per il carattere di controllo
        const odd = {
            "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
            A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
            K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
            U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
        };

        const even = {
            "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
            A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
            K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
            U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
        };

        let sum = 0;
        for (let i = 0; i < 15; i++) {
            const ch = cf[i];
            // posizione 1-based: 1,3,5... = odd  -> 0-based i=0,2,4...
            sum += (i % 2 === 0 ? odd[ch] : even[ch]);
            if (Number.isNaN(sum)) return false;
        }

        const expected = String.fromCharCode((sum % 26) + 65);
        return cf[15] === expected;
    }

    const storedTaxCode = useMemo(() => {
        // Prendo CF/P.IVA da user (nome campo può variare: metto più tentativi)
        const u = user || {};
        const candidates = [
            u?.taxCode,
            u?.codiceFiscale,
            u?.fiscalCode,
            u?.taxId,
            u?.vatNumber,
            u?.vat,
            u?.piva,
            u?.partitaIva,
        ];
        const found = candidates.find((v) => String(v || "").trim());
        return normalizeTaxCode(found);
    }, [user]);

    const isVatUser = useMemo(() => {
        const u = user || {};
        return Boolean(
            u?.isBusiness ||
            u?.isCompany ||
            u?.customerType === "business" ||
            u?.customerType === "piva" ||
            (storedTaxCode && /^\d{11}$/.test(String(storedTaxCode)))
        );
    }, [user, storedTaxCode]);

    useEffect(() => {
        if (isVatUser) return;
        if (!storedTaxCode) return;

        setForm((prev) => {
            const current = normalizeTaxCode(prev.taxCode);
            if (current === storedTaxCode) return prev;
            return { ...prev, taxCode: storedTaxCode };
        });
    }, [storedTaxCode, isVatUser]);

    function validateClient() {
        const e = {};
        if (!form.name.trim()) e.name = "Nome richiesto";
        if (!form.surname.trim()) e.surname = "Cognome richiesto";

        if (!isVatUser) {
            const tc = storedTaxCode || normalizeTaxCode(form.taxCode);
            if (!tc) e.taxCode = "Codice Fiscale richiesto";
            else if (!isValidCodiceFiscale(tc)) {
                e.taxCode = "Codice Fiscale non valido";
            }
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

        const orders = await fetchMyOrders();
        const found = Array.isArray(orders)
            ? orders.find((o) => String(o.publicId) === String(publicId))
            : null;

        return found?._id ? String(found._id) : null;
    }

    async function createStripeCheckoutSession(orderId) {
        const oid = String(orderId || "").trim();
        if (!oid) throw new Error("orderId mancante");

        let res;
        try {
            res = await authFetch("/api/payments/stripe/checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ orderId: oid }),
            });
        } catch (err) {
            if (err?.code === "SESSION_EXPIRED") {
                navigate("/shop/login?next=/shop/checkout", { replace: true });
                throw new Error("Sessione scaduta, rifai login");
            }
            throw err;
        }

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
            // ✅ P.IVA: non chiediamo nulla nel checkout, prendiamo dal profilo (storedTaxCode)
            const taxCode = isVatUser ? storedTaxCode : (storedTaxCode || normalizeTaxCode(form.taxCode));

            if (isVatUser) {
                if (!taxCode) {
                    setSubmitError("Dati di fatturazione mancanti nel profilo. Aggiornali in Area utente.");
                    return;
                }
                // Se vuoi, qui puoi validare P.IVA con checksum (poi lo aggiungiamo).
            } else {
                if (!taxCode) {
                    setFieldErrors((prev) => ({ ...prev, taxCode: "Codice Fiscale richiesto" }));
                    setSubmitError("Controlla i campi evidenziati.");
                    return;
                }
                if (!isValidCodiceFiscale(taxCode)) {
                    setFieldErrors((prev) => ({ ...prev, taxCode: "Codice Fiscale non valido" }));
                    setSubmitError("Controlla i campi evidenziati.");
                    return;
                }
            }

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
            const taxCode = isVatUser ? storedTaxCode : (storedTaxCode || normalizeTaxCode(form.taxCode));

            if (isVatUser && !taxCode) {
                setSubmitError("Dati di fatturazione mancanti nel profilo. Aggiornali in Area utente.");
                return;
            }

            if (!isVatUser) {
                if (!taxCode) {
                    setFieldErrors((prev) => ({ ...prev, taxCode: "Codice Fiscale richiesto" }));
                    setSubmitError("Controlla i campi evidenziati.");
                    return;
                }
                if (!isValidCodiceFiscale(taxCode)) {
                    setFieldErrors((prev) => ({ ...prev, taxCode: "Codice Fiscale non valido" }));
                    setSubmitError("Controlla i campi evidenziati.");
                    return;
                }
            }

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
                created = await createOrder({ shippingAddressId: selectedAddressId, taxCode, paymentMethod: "bank_transfer" });
            } else {
                if (saveToAddressBook) {
                    const saved = await createAddress({ label: addressLabel.trim(), ...payload });
                    created = await createOrder({ shippingAddressId: saved._id, taxCode, paymentMethod: "bank_transfer" });
                } else {
                    created = await createOrder({ shippingAddress: payload, taxCode, paymentMethod: "bank_transfer" });
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
                <Link to="/shop/cart" className="btn btn-outline-light shop-checkout-back-btn">
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

                            {!isVatUser ? (
                                <div className="col-12">
                                    <label className="form-label">Codice Fiscale (per fattura)</label>
                                    <input
                                        className={`form-control ${fieldErrors.taxCode ? "is-invalid" : ""}`}
                                        name="taxCode"
                                        value={form.taxCode}
                                        onChange={onChange}
                                        disabled={busy || Boolean(storedTaxCode)}
                                        placeholder="Es. RSSMRA80A01H501U"
                                        autoCapitalize="characters"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        inputMode="text"
                                    />
                                    {fieldErrors.taxCode && <div className="invalid-feedback">{fieldErrors.taxCode}</div>}
                                    {!fieldErrors.taxCode ? (
                                        storedTaxCode ? (
                                            <div className="form-text">Codice fiscale già salvato nel profilo: lo useremo automaticamente.</div>
                                        ) : (addressMode === "saved" && selectedAddressId && form.taxCode) ? (
                                            <div className="form-text">Codice fiscale precompilato dall’indirizzo salvato.</div>
                                        ) : (
                                            <div className="form-text">16 caratteri (persona fisica).</div>
                                        )
                                    ) : null}
                                </div>
                            ) : null}

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
