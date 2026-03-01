import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useShop } from "../context/ShopContext";

import "./ShopAuth.css"

export default function LoginShop() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/shop/cart";
    const resetOk = params.get("reset") === "1";

    const { user, login, logout, token } = useAuth();
    const { fetchMyAddresses, createAddress, setDefaultAddress } = useShop();

    const apiBase = import.meta.env.VITE_API_URL;
    const authToken = token || localStorage.getItem("token");

    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        companyName: "",
        vatNumber: "",
        billingAddressId: "",
    });

    const [profileError, setProfileError] = useState("");
    const [profileOk, setProfileOk] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

    useEffect(() => {
        if (!user) return;

        setProfile({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            companyName: user.companyName || "",
            vatNumber: user.vatNumber || "",
            billingAddressId: user.billingAddressRef ? String(user.billingAddressRef) : "",
        });
    }, [user]);

    function onProfileChange(e) {
        const { name, value } = e.target;
        setProfile((p) => ({ ...p, [name]: value }));
        setProfileError("");
        setProfileOk("");
    }

    function startEditProfile() {
        if (!user) return;
        setProfile({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            companyName: user.companyName || "",
            vatNumber: user.vatNumber || "",
            billingAddressId: user.billingAddressRef ? String(user.billingAddressRef) : "",
        });
        setProfileError("");
        setProfileOk("");
        setEditingProfile(true);
    }

    function cancelEditProfile() {
        if (!user) return;
        setProfile({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            companyName: user.companyName || "",
            vatNumber: user.vatNumber || "",
            billingAddressId: user.billingAddressRef ? String(user.billingAddressRef) : "",
        });
        setProfileError("");
        setProfileOk("");
        setEditingProfile(false);
    }

    async function saveProfile(e) {
        e.preventDefault();
        setProfileError("");
        setProfileOk("");
        setEditingProfile(false);

        if (!authToken) {
            setProfileError("Non sei autenticato.");
            return;
        }

        setProfileSaving(true);
        try {
            const res = await fetch(`${apiBase}/api/auth/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    phone: profile.phone,
                    companyName: profile.companyName,
                    vatNumber: profile.vatNumber,
                    billingAddressId: profile.billingAddressId || null,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    data?.errors?.firstName ||
                    data?.errors?.lastName ||
                    data?.errors?.phone ||
                    data?.errors?.companyName ||
                    data?.errors?.vatNumber ||
                    data?.errors?.billingAddressId ||
                    data?.message ||
                    "Errore salvataggio";
                throw new Error(msg);
            }

            const u = data?.user;
            if (u) {
                setProfile({
                    firstName: u.firstName || "",
                    lastName: u.lastName || "",
                    phone: u.phone || "",
                    companyName: u.companyName || "",
                    vatNumber: u.vatNumber || "",
                    billingAddressId: u.billingAddressRef ? String(u.billingAddressRef) : "",
                });
            }

            setProfileOk("Dati salvati ✅");
        } catch (err) {
            setProfileError(err.message || "Errore salvataggio");
        } finally {
            setProfileSaving(false);
        }
    }

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [pwError, setPwError] = useState("");
    const [pwOk, setPwOk] = useState("");
    const [pwSubmitting, setPwSubmitting] = useState(false);

    const [addresses, setAddresses] = useState([]);
    const [addrLoading, setAddrLoading] = useState(false);
    const [addrError, setAddrError] = useState("");
    const [addrBusyId, setAddrBusyId] = useState(null);

    const [showNewAddress, setShowNewAddress] = useState(false);
    const [newAddr, setNewAddr] = useState({
        name: "",
        surname: "",
        phone: "",
        address: "",
        streetNumber: "",
        city: "",
        cap: "",
    });
    const [newAddrError, setNewAddrError] = useState("");
    const [newAddrSubmitting, setNewAddrSubmitting] = useState(false);
    const [newAddrMakeDefault, setNewAddrMakeDefault] = useState(false);

    function onNewAddrChange(e) {
        const { name, value } = e.target;
        setNewAddr((prev) => ({ ...prev, [name]: value }));
        setNewAddrError("");
    }


    useEffect(() => {
        let alive = true;

        async function loadAddresses() {
            if (!user) return;
            setAddrLoading(true);
            setAddrError("");

            try {
                const list = await fetchMyAddresses();
                if (!alive) return;
                setAddresses(list || []);
            } catch (e) {
                if (!alive) return;
                setAddrError(e.message || "Errore caricamento indirizzi");
            } finally {
                if (!alive) return;
                setAddrLoading(false);
            }
        }

        loadAddresses();
        return () => {
            alive = false;
        };
    }, [user, fetchMyAddresses]);

    async function makeDefaultAddress(id) {
        setAddrBusyId(id);
        setAddrError("");
        try {
            await setDefaultAddress(id);
            const list = await fetchMyAddresses();
            setAddresses(list || []);
        } catch (e) {
            setAddrError(e.message || "Errore impostazione default");
        } finally {
            setAddrBusyId(null);
        }
    }

    async function submitNewAddress(e) {
        e.preventDefault();
        setNewAddrError("");

        if (!newAddr.name.trim()) return setNewAddrError("Nome richiesto");
        if (!newAddr.surname.trim()) return setNewAddrError("Cognome richiesto");
        if (!newAddr.phone.trim()) return setNewAddrError("Telefono richiesto");
        if (!newAddr.address.trim()) return setNewAddrError("Indirizzo richiesto");
        if (!newAddr.streetNumber.trim()) return setNewAddrError("N° civico richiesto");
        if (!newAddr.city.trim()) return setNewAddrError("Città richiesta");
        if (!/^\d{5}$/.test(newAddr.cap.trim())) return setNewAddrError("CAP non valido (5 cifre)");

        setNewAddrSubmitting(true);
        try {
            const created = await createAddress({
                name: newAddr.name.trim(),
                surname: newAddr.surname.trim(),
                phone: newAddr.phone.trim(),
                address: newAddr.address.trim(),
                streetNumber: newAddr.streetNumber.trim(),
                city: newAddr.city.trim(),
                cap: newAddr.cap.trim(),
                email: user?.email || "",
            });

            if (newAddrMakeDefault && created?._id) {
                await setDefaultAddress(created._id);
            }

            const list = await fetchMyAddresses();
            setAddresses(list || []);

            setNewAddr({
                name: "",
                surname: "",
                phone: "",
                address: "",
                streetNumber: "",
                city: "",
                cap: "",
            });
            setNewAddrMakeDefault(false);
            setShowNewAddress(false);
        } catch (err) {
            setNewAddrError(err.message || "Errore creazione indirizzo");
        } finally {
            setNewAddrSubmitting(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPwError("");
        setPwOk("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPwError("Compila tutti i campi.");
            return;
        }
        if (newPassword.length < 8) {
            setPwError("La nuova password deve avere almeno 8 caratteri.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPwError("Le nuove password non coincidono.");
            return;
        }
        if (!authToken) {
            setPwError("Non sei autenticato.");
            return;
        }

        setPwSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/api/auth/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    data?.errors?.currentPassword ||
                    data?.errors?.newPassword ||
                    data?.message ||
                    "Errore cambio password";
                throw new Error(msg);
            }

            setPwOk("Password aggiornata correttamente ✅");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (err) {
            setPwError(err.message || "Errore cambio password");
        } finally {
            setPwSubmitting(false);
        }
    }

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function formatLoginError(err) {
        const raw = String(err?.message || "").trim();
        const low = raw.toLowerCase();

        if (
            low.includes("invalid credentials") ||
            low.includes("credenziali") ||
            low.includes("unauthorized") ||
            low.includes("401")
        ) {
            return "Email o password non corrette.";
        }

        if (low.includes("failed to fetch") || low.includes("network")) {
            return "Problema di connessione. Riprova tra poco.";
        }

        return "Accesso non riuscito. Riprova.";
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login(String(email).trim(), password);
            navigate(next, { replace: true });
        } catch (err) {
            setError(formatLoginError(err));
            setPassword("");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container py-4 shop-auth" style={{ maxWidth: 720 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 shop-auth-header">
                <h1 className="mb-0">{user ? "Area utente" : "Accesso"}</h1>
                <Link
                    to="/shop"
                    className="btn btn-outline-light btn-sm text-nowrap px-2 py-1"
                    style={{ flex: "0 0 auto", width: "auto" }}
                >
                    Torna allo shop
                </Link>
            </div>

            {user ? (
                <div className="card p-3 shop-card">
                    {/* 1) Dati account + fatturazione */}
                    <div className="shop-profile-head mb-2">
                        <div className="fw-semibold">Dati account</div>

                        {!editingProfile ? (
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm shop-edit-btn"
                                onClick={startEditProfile}
                            >
                                Modifica
                            </button>
                        ) : null}
                    </div>


                    {profileError ? (
                        <div className="alert alert-danger py-2" role="alert">
                            {profileError}
                        </div>
                    ) : null}

                    {profileOk ? (
                        <div className="alert alert-success py-2" role="alert">
                            {profileOk}
                        </div>
                    ) : null}

                    {!editingProfile ? (
                        <>
                            <div style={{ fontSize: 14 }}>
                                <div>
                                    <span className="text-muted">Nome:</span>{" "}
                                    <strong>{user.firstName} {user.lastName}</strong>
                                </div>
                                <div className="mt-1">
                                    <span className="text-muted">Telefono:</span>{" "}
                                    <strong>{user.phone || "—"}</strong>
                                </div>
                                <div className="mt-1">
                                    <span className="text-muted">Email:</span> <strong>{user.email}</strong>
                                </div>
                                <div className="mt-1">
                                    <span className="text-muted">Tipo:</span>{" "}
                                    <strong>{user.customerType === "piva" ? "P.IVA" : "Privato"}</strong>
                                </div>
                            </div>

                            <hr />

                            <div className="fw-semibold mb-2">Fatturazione</div>
                            <div style={{ fontSize: 14 }}>
                                {user.customerType === "piva" ? (
                                    <>
                                        <div>
                                            <span className="text-muted">Ragione sociale:</span>{" "}
                                            <strong>{user.companyName || "—"}</strong>
                                        </div>
                                        <div className="mt-1">
                                            <span className="text-muted">P.IVA:</span>{" "}
                                            <strong>{user.vatNumber || "—"}</strong>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <span className="text-muted">Intestatario:</span>{" "}
                                        <strong>{user.firstName} {user.lastName}</strong>
                                    </div>
                                )}

                                <div className="mt-2">
                                    <span className="text-muted">Indirizzo fatturazione:</span>{" "}
                                    <strong>
                                        {(() => {
                                            const id = user.billingAddressRef ? String(user.billingAddressRef) : "";
                                            const a = addresses.find(x => String(x._id) === id);
                                            if (!id) return "—";
                                            if (!a) return "Selezionato (non caricato)";
                                            const civic = a.streetNumber ? `, ${a.streetNumber}` : "";
                                            return `${a.address}${civic}, ${a.city} (${a.cap})`;
                                        })()}
                                    </strong>
                                </div>

                                <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                                    Spedizione e fatturazione possono essere diverse.
                                </div>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={saveProfile}>
                            <div className="row g-2">
                                <div className="col-12 col-md-6">
                                    <label className="form-label">Nome</label>
                                    <input className="form-control" name="firstName" value={profile.firstName} onChange={onProfileChange} />
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label">Cognome</label>
                                    <input className="form-control" name="lastName" value={profile.lastName} onChange={onProfileChange} />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Telefono</label>
                                    <input className="form-control" name="phone" value={profile.phone} onChange={onProfileChange} />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" value={user.email} disabled />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Tipo</label>
                                    <input className="form-control" value={user.customerType === "piva" ? "P.IVA" : "Privato"} disabled />
                                </div>
                            </div>

                            <hr />

                            <div className="fw-semibold mb-2">Fatturazione</div>

                            {user.customerType === "piva" ? (
                                <div className="row g-2">
                                    <div className="col-12">
                                        <label className="form-label">Ragione sociale</label>
                                        <input className="form-control" name="companyName" value={profile.companyName} onChange={onProfileChange} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Partita IVA</label>
                                        <input className="form-control" name="vatNumber" value={profile.vatNumber} onChange={onProfileChange} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted" style={{ fontSize: 13 }}>
                                    Intestatario fattura: <strong>{profile.firstName} {profile.lastName}</strong>
                                </div>
                            )}

                            <div className="mt-3">
                                <label className="form-label">Indirizzo di fatturazione</label>
                                <select
                                    className="form-select"
                                    name="billingAddressId"
                                    value={profile.billingAddressId}
                                    onChange={onProfileChange}
                                    disabled={addrLoading}
                                >
                                    <option value="">Nessuno (lo scegli al checkout)</option>
                                    {addresses.map((a) => {
                                        const civic = a.streetNumber ? `, ${a.streetNumber}` : "";
                                        return (
                                            <option key={a._id} value={a._id}>
                                                {a.address}{civic}, {a.city} ({a.cap})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="d-flex gap-2 mt-3">
                                <button className="btn btn-primary" type="submit" disabled={profileSaving}>
                                    {profileSaving ? "Salvo..." : "Salva"}
                                </button>

                                <button type="button" className="btn btn-outline-secondary" onClick={cancelEditProfile} disabled={profileSaving}>
                                    Annulla
                                </button>
                            </div>
                        </form>
                    )}


                    {/* 3) Indirizzi */}
                    <hr />

                    <div className="fw-semibold mb-2">Indirizzi di spedizione</div>

                    {addrError ? (
                        <div className="alert alert-danger py-2" role="alert">
                            {addrError}
                        </div>
                    ) : null}

                    {addrLoading ? (
                        <div className="text-muted" style={{ fontSize: 13 }}>
                            Carico indirizzi...
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="text-muted" style={{ fontSize: 13 }}>
                            Nessun indirizzo salvato.
                        </div>
                    ) : (
                        <div className="list-group">
                            {addresses.map((a) => {
                                const civic = a.streetNumber ? `, ${a.streetNumber}` : "";
                                return (
                                    <div key={a._id} className="list-group-item">
                                        <div className="d-flex justify-content-between align-items-start gap-3">
                                            <div style={{ fontSize: 14 }}>
                                                <div className="fw-semibold">
                                                    Indirizzo
                                                    {a.isDefault ? (
                                                        <span className="badge text-bg-success ms-2">Indirizzo predefinito</span>
                                                    ) : null}
                                                </div>

                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                    {a.name} {a.surname} {a.phone ? `• ${a.phone}` : ""}
                                                </div>
                                                <div className="mt-2">
                                                    {a.address}{civic}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: 13 }}>
                                                    {a.city} ({a.cap})
                                                </div>
                                            </div>

                                            {!a.isDefault ? (
                                                <button
                                                    className="btn btn-sm shop-edit-btn"
                                                    onClick={() => makeDefaultAddress(a._id)}
                                                    disabled={addrBusyId === a._id}
                                                >
                                                    {addrBusyId === a._id ? "..." : "Imposta come predefinito"}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-3">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowNewAddress((v) => !v)}
                        >
                            {showNewAddress ? "Chiudi" : "Aggiungi nuovo indirizzo"}
                        </button>

                        {showNewAddress ? (
                            <form className="mt-3" onSubmit={submitNewAddress}>
                                {newAddrError ? (
                                    <div className="alert alert-danger py-2" role="alert">
                                        {newAddrError}
                                    </div>
                                ) : null}

                                <div className="row g-2">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Nome</label>
                                        <input className="form-control" name="name" value={newAddr.name} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Cognome</label>
                                        <input className="form-control" name="surname" value={newAddr.surname} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Telefono</label>
                                        <input className="form-control" name="phone" value={newAddr.phone} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Indirizzo</label>
                                        <input className="form-control" name="address" value={newAddr.address} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <label className="form-label">N° civico</label>
                                        <input className="form-control" name="streetNumber" value={newAddr.streetNumber} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12 col-md-5">
                                        <label className="form-label">Città</label>
                                        <input className="form-control" name="city" value={newAddr.city} onChange={onNewAddrChange} />
                                    </div>

                                    <div className="col-12 col-md-3">
                                        <label className="form-label">CAP</label>
                                        <input className="form-control" name="cap" value={newAddr.cap} onChange={onNewAddrChange} />
                                    </div>
                                </div>

                                <div className="form-check mt-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="mkDefault"
                                        checked={newAddrMakeDefault}
                                        onChange={(e) => setNewAddrMakeDefault(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="mkDefault">
                                        Imposta come indirizzo predefinito
                                    </label>
                                </div>

                                <button className="btn btn-primary mt-3" type="submit" disabled={newAddrSubmitting}>
                                    {newAddrSubmitting ? "Salvo..." : "Salva indirizzo"}
                                </button>
                            </form>
                        ) : null}
                    </div>

                    <hr />

                    <div className="fw-semibold mb-2">Cambio password</div>

                    {pwError && (
                        <div className="alert alert-danger py-2" role="alert">
                            {pwError}
                        </div>
                    )}
                    {pwOk && (
                        <div className="alert alert-success py-2" role="alert">
                            {pwOk}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword}>
                        {/* Password attuale */}
                        <div className="mb-2">
                            <label className="form-label">Password attuale</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary shop-eye-btn"
                                    onClick={() => setShowCurrent((v) => !v)}
                                    aria-label="Mostra/Nascondi password attuale"
                                >
                                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Nuova password */}
                        <div className="mb-2">
                            <label className="form-label">Nuova password</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary shop-eye-btn"
                                    onClick={() => setShowNew((v) => !v)}
                                    aria-label="Mostra/Nascondi nuova password"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="form-text">Minimo 8 caratteri.</div>
                        </div>

                        {/* Conferma nuova password */}
                        <div className="mb-3">
                            <label className="form-label">Conferma nuova password</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary shop-eye-btn"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    aria-label="Mostra/Nascondi conferma password"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button className="btn shop-edit-btn" type="submit" disabled={pwSubmitting}>
                            {pwSubmitting ? "Aggiorno..." : "Aggiorna password"}
                        </button>
                    </form>


                    <div className="d-flex flex-wrap gap-2 mt-3">
                        <button
                            className="btn btn-outline-danger shop-logout-btn"
                            onClick={() => {
                                logout();
                                navigate("/shop", { replace: true });
                            }}
                        >
                            Logout
                        </button>

                        <button className="btn shop-edit-btn" onClick={() => navigate(next, { replace: true })}>
                            Chiudi
                        </button>
                    </div>
                </div>

            ) : (
                <form className="card p-3 shop-card" onSubmit={handleSubmit}>
                    {resetOk ? (
                        <div className="alert alert-success py-2" role="alert">
                            Password aggiornata ✅ Ora puoi accedere.
                        </div>
                    ) : null}
                    {error && (
                        <div className="alert alert-danger py-2" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            className="form-control"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            className="form-control"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <div className="mt-2" style={{ fontSize: 16 }}>
                            <Link to={`/shop/forgot-password?next=${encodeURIComponent(next)}`}>
                                Password dimenticata?
                            </Link>
                        </div>

                    </div>

                    <button type="submit" className="btn shop-btn-primary" disabled={submitting}>
                        {submitting ? "Accesso..." : "Accedi"}
                    </button>

                    <p className="text-muted mt-2 mb-0" style={{ fontSize: 16 }}>
                        Non hai un account?{" "}
                        <Link to={`/shop/register?next=${encodeURIComponent(next)}`}>Registrati</Link>
                    </p>
                </form>
            )}
        </div>
    );
}
