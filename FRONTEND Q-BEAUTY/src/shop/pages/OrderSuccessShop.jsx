import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandSpinner from "../components/BrandSpinner";

import "./OrderSuccessShop.css";

export default function OrderSuccessShop() {
    const navigate = useNavigate();
    const { id } = useParams(); 
    const { user, loading, token } = useAuth();

    const apiBase = useMemo(() => import.meta.env.VITE_API_URL, []);

    const [order, setOrder] = useState(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");
    const [paying, setPaying] = useState(false);

    const [bankSending, setBankSending] = useState(false);
    const [bankInfo, setBankInfo] = useState(""); 
    const [bankSent, setBankSent] = useState(null); 
    const [bankCanResend, setBankCanResend] = useState(false);

    const bankAutoTriggeredRef = useRef(false);

    const location = useLocation();
    const pay = new URLSearchParams(location.search).get("pay");
    const isBankTransfer = pay === "bank";

    const BANK = {
        beneficiary: "Q•BEAUTY",
        iban: "IT00X0000000000000000000000",
        bankName: "La tua banca (opzionale)",
        bic: "", 
    };

    useEffect(() => {
        if (loading) return;
        if (!user) navigate(`/shop/login?next=/shop/order-success/${id}`, { replace: true });
    }, [user, loading, navigate, id]);

    useEffect(() => {
        bankAutoTriggeredRef.current = false;
        setBankInfo("");
        setBankSent(null);
        setBankCanResend(false);
    }, [id]);

    useEffect(() => {
        let alive = true;

        async function load() {
            if (loading) return;
            if (!user) return;
            if (!id) {
                setError("ID ordine mancante.");
                setFetching(false);
                return;
            }
            if (!apiBase) {
                setError("VITE_API_URL non configurata.");
                setFetching(false);
                return;
            }
            if (!token) {
                setError("Token mancante. Rifai login.");
                setFetching(false);
                return;
            }

            setFetching(true);
            setError("");

            try {
                const res = await fetch(`${apiBase}/api/orders/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.message || "Errore lettura ordini");

                const list = data?.orders || [];
                const found = list.find((o) => String(o._id) === String(id));

                if (!alive) return;

                if (!found) {
                    setOrder(null);
                    setError("Ordine non trovato tra i tuoi ordini.");
                } else {
                    setOrder(found);
                }
            } catch (e) {
                if (!alive) return;
                setError(e?.message || "Errore caricamento ordine");
            } finally {
                if (!alive) return;
                setFetching(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [id, user, loading, apiBase, token]);

    async function requestBankInstructions(force = false) {
        if (!apiBase || !token || !id) return;

        setBankSending(true);
        setBankInfo("");
        setBankCanResend(false);

        try {
            const res = await fetch(`${apiBase}/api/payments/bank-transfer/send-instructions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify(force ? { orderId: id, force: true } : { orderId: id }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Errore invio istruzioni bonifico");

            const sentNow = data?.sent === true;
            const alreadySent = data?.alreadySent === true || data?.sent === false;

            if (sentNow) {
                setBankSent(true);
                setBankCanResend(false);
                setBankInfo("Ti abbiamo inviato una mail con le istruzioni per il bonifico. Controlla anche lo spam.");
            } else if (alreadySent) {
                setBankSent(false);
                setBankCanResend(true);
                setBankInfo(
                    "Le istruzioni del bonifico risultano già inviate via email. Se non la trovi, controlla lo spam oppure premi Reinvia."
                );
            } else {
                setBankSent(true);
                setBankCanResend(false);
                setBankInfo("Istruzioni bonifico gestite correttamente. Controlla la posta (anche spam).");
            }
        } catch (e) {
            setBankSent(false);
            setBankCanResend(true);
            setBankInfo(e?.message || "Errore invio istruzioni bonifico");
        } finally {
            setBankSending(false);
        }
    }

    useEffect(() => {
        if (!isBankTransfer) return;
        if (!order) return;
        if (order.status === "paid") return;

        if (bankAutoTriggeredRef.current) return;
        bankAutoTriggeredRef.current = true;

        requestBankInstructions(false);
    }, [isBankTransfer, order?._id, order?.status]);

    async function retryPayment() {
        if (!apiBase) return;
        if (!token) return;
        if (!id) return;

        setPaying(true);
        setError("");

        try {
            const res = await fetch(`${apiBase}/api/payments/stripe/checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify({ orderId: id }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Errore creazione sessione Stripe");
            if (!data?.url) throw new Error("Stripe non ha restituito la URL di checkout");

            window.location.assign(data.url);
        } catch (e) {
            setError(e?.message || "Errore avvio pagamento");
            setPaying(false);
        }
    }

    if (loading) return <BrandSpinner text="Verifico ordine..." />;
    if (!user) return <BrandSpinner text="Ti porto alla pagina di accesso..." />;

    if (fetching) return <BrandSpinner text="Sto verificando lo stato del pagamento..." />;

    const status = order?.status;

    return (
        <div className="container py-4 shop-order-success" style={{ maxWidth: 720 }}>
            <div className="card p-4">
                {!error ? (
                    <>
                        {status === "paid" ? (
                            <>
                                <h1 className="h4 mb-2">Pagamento confermato ✅</h1>
                                <p className="mb-3">
                                    Ordine registrato e pagamento ricevuto.
                                    <br />
                                    Riceverai aggiornamenti su lavorazione e spedizione.
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="h4 mb-2">{isBankTransfer ? "Bonifico bancario" : "Ordine creato"}</h1>

                                {isBankTransfer ? (
                                    <>
                                        <p className="mb-3">
                                            Hai scelto <strong>bonifico bancario</strong>.
                                            <br />
                                            Usa i dati qui sotto.
                                        </p>

                                        {bankSending ? (
                                            <div className="alert alert-secondary py-2">
                                                Sto inviando le istruzioni del bonifico via email...
                                            </div>
                                        ) : bankInfo ? (
                                            <div className={`alert ${bankSent ? "alert-success" : "alert-warning"} py-2`}>
                                                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                                    <div>{bankInfo}</div>

                                                    {bankCanResend ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => requestBankInstructions(true)}
                                                            disabled={bankSending}
                                                        >
                                                            Reinvia
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="alert alert-secondary mt-3" style={{ borderRadius: 14 }}>
                                            <div className="text-muted" style={{ fontSize: 15 }}>Intestatario:</div>
                                            <div className="fw-semibold">{BANK.beneficiary}</div>

                                            <div className="mt-2 text-muted" style={{ fontSize: 15 }}>IBAN:</div>
                                            <div className="fw-semibold">{BANK.iban}</div>

                                            {BANK.bankName ? (
                                                <>
                                                    <div className="mt-2 text-muted" style={{ fontSize: 15 }}>Banca:</div>
                                                    <div className="fw-semibold">{BANK.bankName}</div>
                                                </>
                                            ) : null}

                                            {BANK.bic ? (
                                                <>
                                                    <div className="mt-2 text-muted" style={{ fontSize: 15 }}>BIC/SWIFT:</div>
                                                    <div className="fw-semibold">{BANK.bic}</div>
                                                </>
                                            ) : null}

                                            <div className="mt-3 text-muted" style={{ fontSize: 15 }}>Causale:</div>
                                            <div className="fw-semibold">{order?.publicId || "—"}</div>

                                            <div className="mt-3 text-muted" style={{ fontSize: 14 }}>
                                                Lo stato passerà a <strong>Pagato</strong> quando registriamo il bonifico.
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="mb-3">
                                            Il tuo ordine è stato creato, ma il pagamento risulta ancora <strong>non completato</strong>.
                                            <br />
                                            Se hai annullato Stripe o hai chiuso la pagina, puoi riprovare.
                                        </p>

                                        <button className="btn btn-primary" onClick={retryPayment} disabled={paying}>
                                            {paying ? "Apro Stripe..." : "Riprova pagamento"}
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        <div className="mt-3">
                            <div className="text-muted" style={{ fontSize: 15 }}>
                                Numero ordine:
                            </div>
                            <div className="fw-semibold">
                                {order?.publicId || "—"}
                            </div>

                            {status ? (
                                <div className="text-muted" style={{ fontSize: 15 }}>
                                    Stato: <span className="fw-semibold">{status}</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <Link to="/shop/orders" className="btn btn-outline-secondary">
                                I miei ordini
                            </Link>

                            <Link to="/shop" className="btn btn-outline-secondary">
                                Torna allo shop
                            </Link>

                            <Link to="/" className="btn btn-outline-secondary">
                                Torna al sito
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="h4 mb-2">Non riesco a verificare l’ordine</h1>
                        <div className="alert alert-warning py-2 mb-3">{error}</div>

                        {id ? (
                            <div className="mb-3">
                                <span className="text-muted" style={{ fontSize: 13 }}>ID ordine:</span>
                                <div className="fw-semibold">{id}</div>
                            </div>
                        ) : null}

                        <div className="d-flex gap-2">
                            <Link to="/shop/orders" className="btn btn-outline-secondary">
                                I miei ordini
                            </Link>
                            <Link to="/shop" className="btn btn-outline-secondary">
                                Torna allo shop
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
