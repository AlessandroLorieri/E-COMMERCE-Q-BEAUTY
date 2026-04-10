import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useShop } from "../context/ShopContext";
import Seo from "../../components/Seo";

import "./ShopAuth.css"

export default function LoginShop() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/shop/cart";
    const resetOk = params.get("reset") === "1";

    const { user, login, logout, token } = useAuth();
    const { fetchMyAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } = useShop();

    const apiBase = import.meta.env.VITE_API_URL;
    const authToken = token || localStorage.getItem("token");

    const [localUser, setLocalUser] = useState(null);
    const currentUser = localUser || user;

    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        companyName: "",
        vatNumber: "",
        taxCode: "",
        billingAddressId: "",
        billingAddress: "",
        billingStreetNumber: "",
        billingCity: "",
        billingCap: "",
    });

    const [profileError, setProfileError] = useState("");
    const [profileOk, setProfileOk] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

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

    const [editingAddressId, setEditingAddressId] = useState("");
    const [editAddr, setEditAddr] = useState({
        name: "",
        surname: "",
        phone: "",
        address: "",
        streetNumber: "",
        city: "",
        cap: "",
    });
    const [editAddrError, setEditAddrError] = useState("");
    const [editAddrSubmitting, setEditAddrSubmitting] = useState(false);

    const shippingAddresses = addresses.filter((a) => {
        const label = String(a?.label || "").trim().toLowerCase();
        return label !== "sede legale";
    });

    useEffect(() => {
        setLocalUser(user || null);
    }, [user]);

    useEffect(() => {
        if (!currentUser || editingProfile) return;
        setProfile(buildProfileState(currentUser, addresses));
    }, [currentUser, addresses, editingProfile]);

    function onProfileChange(e) {
        const { name, value } = e.target;
        setProfile((p) => ({ ...p, [name]: value }));
        setProfileError("");
        setProfileOk("");
    }

    function normalizeHumanText(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/(^|[\s'-])([a-zà-öø-ÿ])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
    }

    function buildProfileState(sourceUser, list = []) {
        const billingAddressId = sourceUser?.billingAddressRef ? String(sourceUser.billingAddressRef) : "";
        const billingAddress = billingAddressId
            ? list.find((x) => String(x._id) === billingAddressId) || null
            : null;

        return {
            firstName: sourceUser?.firstName || "",
            lastName: sourceUser?.lastName || "",
            phone: sourceUser?.phone || "",
            companyName: sourceUser?.companyName || "",
            vatNumber: sourceUser?.vatNumber || "",
            taxCode: sourceUser?.taxCode || "",
            billingAddressId,
            billingAddress: billingAddress?.address || "",
            billingStreetNumber: billingAddress?.streetNumber || "",
            billingCity: billingAddress?.city || "",
            billingCap: billingAddress?.cap || "",
        };
    }

    function startEditProfile() {
        if (!currentUser) return;
        setProfile(buildProfileState(currentUser, addresses));
        setProfileError("");
        setProfileOk("");
        setEditingProfile(true);
    }

    function cancelEditProfile() {
        if (!currentUser) return;
        setProfile(buildProfileState(currentUser, addresses));
        setProfileError("");
        setProfileOk("");
        setEditingProfile(false);
    }

    async function saveProfile(e) {
        e.preventDefault();
        setProfileError("");
        setProfileOk("");

        if (!authToken) {
            setProfileError("Non sei autenticato.");
            return;
        }

        const normalizedFirstName = normalizeHumanText(profile.firstName);
        const normalizedLastName = normalizeHumanText(profile.lastName);
        const normalizedPhone = String(profile.phone || "").trim();
        const normalizedCompanyName = String(profile.companyName || "").trim();
        const normalizedVatNumber = String(profile.vatNumber || "").trim();
        const normalizedTaxCode = String(profile.taxCode || "").trim().toUpperCase();
        const normalizedBillingAddress = String(profile.billingAddress || "").trim();
        const normalizedBillingStreetNumber = String(profile.billingStreetNumber || "").trim();
        const normalizedBillingCity = normalizeHumanText(profile.billingCity);
        const normalizedBillingCap = String(profile.billingCap || "").trim();

        if (!normalizedFirstName) {
            setProfileError("Nome richiesto");
            return;
        }

        if (!normalizedLastName) {
            setProfileError("Cognome richiesto");
            return;
        }

        if (currentUser?.customerType === "piva") {
            if (!normalizedCompanyName) {
                setProfileError("Ragione sociale richiesta");
                return;
            }

            if (!normalizedVatNumber) {
                setProfileError("Partita IVA richiesta");
                return;
            }

            if (!normalizedTaxCode) {
                setProfileError("Codice fiscale richiesto");
                return;
            }

            if (!normalizedBillingAddress) {
                setProfileError("Indirizzo sede legale richiesto");
                return;
            }

            if (!normalizedBillingStreetNumber) {
                setProfileError("N° civico sede legale richiesto");
                return;
            }

            if (!normalizedBillingCity) {
                setProfileError("Città sede legale richiesta");
                return;
            }

            if (!/^\d{5}$/.test(normalizedBillingCap)) {
                setProfileError("CAP sede legale non valido (5 cifre)");
                return;
            }
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
                    firstName: normalizedFirstName,
                    lastName: normalizedLastName,
                    phone: normalizedPhone,
                    companyName: normalizedCompanyName,
                    vatNumber: normalizedVatNumber,
                    taxCode: currentUser?.customerType === "piva" ? normalizedTaxCode : undefined,
                    billingAddressId:
                        currentUser?.customerType === "piva"
                            ? undefined
                            : (profile.billingAddressId || null),
                    billingAddress:
                        currentUser?.customerType === "piva"
                            ? {
                                address: normalizedBillingAddress,
                                streetNumber: normalizedBillingStreetNumber,
                                city: normalizedBillingCity,
                                cap: normalizedBillingCap,
                            }
                            : undefined,
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
                    data?.errors?.taxCode ||
                    data?.errors?.billingAddressId ||
                    data?.errors?.billingAddress ||
                    data?.message ||
                    "Errore salvataggio";
                throw new Error(msg);
            }

            const refreshedAddresses = await fetchMyAddresses().catch(() => addresses);
            const safeAddresses = Array.isArray(refreshedAddresses) ? refreshedAddresses : addresses;

            setAddresses(safeAddresses);

            const nextUser = data?.user ? { ...currentUser, ...data.user } : currentUser;
            setLocalUser(nextUser);
            setProfile(buildProfileState(nextUser, safeAddresses));

            setProfileOk("Dati salvati ✅");
            setEditingProfile(false);
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

    function onNewAddrChange(e) {
        const { name, value } = e.target;
        setNewAddr((prev) => ({ ...prev, [name]: value }));
        setNewAddrError("");
    }

    function onEditAddrChange(e) {
        const { name, value } = e.target;
        setEditAddr((prev) => ({ ...prev, [name]: value }));
        setEditAddrError("");
        setAddrError("");
    }

    function startEditAddress(addr) {
        const id = String(addr?._id || "").trim();
        if (!id) return;

        setEditingAddressId(id);
        setEditAddr({
            name: String(addr?.name || ""),
            surname: String(addr?.surname || ""),
            phone: String(addr?.phone || ""),
            address: String(addr?.address || ""),
            streetNumber: String(addr?.streetNumber || ""),
            city: String(addr?.city || ""),
            cap: String(addr?.cap || ""),
        });
        setEditAddrError("");
        setAddrError("");
        setShowNewAddress(false);
    }

    function cancelEditAddress() {
        setEditingAddressId("");
        setEditAddr({
            name: "",
            surname: "",
            phone: "",
            address: "",
            streetNumber: "",
            city: "",
            cap: "",
        });
        setEditAddrError("");
    }

    async function submitEditAddress(e) {
        e.preventDefault();
        setEditAddrError("");
        setAddrError("");

        if (!editingAddressId) {
            setEditAddrError("Indirizzo non valido");
            return;
        }

        if (!editAddr.name.trim()) return setEditAddrError("Nome richiesto");
        if (!editAddr.surname.trim()) return setEditAddrError("Cognome richiesto");
        if (!editAddr.phone.trim()) return setEditAddrError("Telefono richiesto");
        if (!editAddr.address.trim()) return setEditAddrError("Indirizzo richiesto");
        if (!editAddr.streetNumber.trim()) return setEditAddrError("N° civico richiesto");
        if (!editAddr.city.trim()) return setEditAddrError("Città richiesta");
        if (!/^\d{5}$/.test(editAddr.cap.trim())) return setEditAddrError("CAP non valido (5 cifre)");

        setEditAddrSubmitting(true);

        try {
            await updateAddress(editingAddressId, {
                name: normalizeHumanText(editAddr.name),
                surname: normalizeHumanText(editAddr.surname),
                phone: editAddr.phone.trim(),
                address: editAddr.address.trim(),
                streetNumber: editAddr.streetNumber.trim(),
                city: normalizeHumanText(editAddr.city),
                cap: editAddr.cap.trim(),
                email: user?.email || "",
            });

            const list = await fetchMyAddresses();
            setAddresses(list || []);
            cancelEditAddress();
        } catch (err) {
            setEditAddrError(err.message || "Errore modifica indirizzo");
        } finally {
            setEditAddrSubmitting(false);
        }
    }

    async function handleDeleteAddress(id) {
        const addressId = String(id || "").trim();
        if (!addressId) return;

        const confirmed = window.confirm("Vuoi eliminare questo indirizzo di spedizione?");
        if (!confirmed) return;

        setAddrBusyId(addressId);
        setAddrError("");

        try {
            await deleteAddress(addressId);
            const list = await fetchMyAddresses();
            setAddresses(list || []);

            if (editingAddressId === addressId) {
                cancelEditAddress();
            }
        } catch (err) {
            setAddrError(err.message || "Errore eliminazione indirizzo");
        } finally {
            setAddrBusyId(null);
        }
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
                name: normalizeHumanText(newAddr.name),
                surname: normalizeHumanText(newAddr.surname),
                phone: newAddr.phone.trim(),
                address: newAddr.address.trim(),
                streetNumber: newAddr.streetNumber.trim(),
                city: normalizeHumanText(newAddr.city),
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
    const [showLoginPassword, setShowLoginPassword] = useState(false);

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
        <>
            <Seo
                title={user ? "Area utente | Q•BEAUTY" : "Accesso | Q•BEAUTY"}
                description={user ? "Area utente Q•BEAUTY." : "Accesso allo shop Q•BEAUTY."}
                canonical="/shop/login"
                noindex
            />

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

                        {currentUser?.customerType === "piva" && !profile.billingAddressId ? (
                            <div className="alert alert-warning py-2" role="alert">
                                Per completare gli ordini come Partita IVA devi inserire la sede legale di fatturazione.
                            </div>
                        ) : null}

                        {!editingProfile ? (
                            <>
                                <div style={{ fontSize: 14 }}>
                                    <div>
                                        <span className="text-muted">Nome:</span>{" "}
                                        <strong>{currentUser?.firstName} {currentUser?.lastName}</strong>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-muted">Telefono:</span>{" "}
                                        <strong>{currentUser?.phone || "—"}</strong>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-muted">Email:</span> <strong>{currentUser?.email}</strong>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-muted">Tipo:</span>{" "}
                                        <strong>{currentUser?.customerType === "piva" ? "P.IVA" : "Privato"}</strong>
                                    </div>
                                </div>

                                <hr />

                                <div className="fw-semibold mb-2">Fatturazione</div>
                                <div style={{ fontSize: 14 }}>
                                    {currentUser?.customerType === "piva" ? (
                                        <>
                                            <div>
                                                <span className="text-muted">Ragione sociale:</span>{" "}
                                                <strong>{currentUser?.companyName || "—"}</strong>
                                            </div>
                                            <div className="mt-1">
                                                <span className="text-muted">P.IVA:</span>{" "}
                                                <strong>{currentUser?.vatNumber || "—"}</strong>
                                            </div>
                                            <div className="mt-1">
                                                <span className="text-muted">Codice fiscale:</span>{" "}
                                                <strong>{currentUser?.taxCode || "—"}</strong>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <span className="text-muted">Intestatario:</span>{" "}
                                            <strong>{currentUser?.firstName} {currentUser?.lastName}</strong>
                                        </div>
                                    )}

                                    <div className="mt-2">
                                        <span className="text-muted">Indirizzo fatturazione:</span>{" "}
                                        <strong>
                                            {(() => {
                                                const id = profile.billingAddressId ? String(profile.billingAddressId) : "";
                                                const a = addresses.find((x) => String(x._id) === id);
                                                if (!id) return currentUser?.customerType === "piva" ? "Non impostato" : "—";
                                                if (!a) return "Salvato ma non caricato";
                                                const civic = a.streetNumber ? `, ${a.streetNumber}` : "";
                                                return `${a.address}${civic}, ${a.city} (${a.cap})`;
                                            })()}
                                        </strong>
                                    </div>

                                    <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                                        {currentUser?.customerType === "piva"
                                            ? "Per la Partita IVA la fatturazione usa sempre questa sede legale, separata dagli indirizzi di spedizione."
                                            : "Spedizione e fatturazione possono essere diverse."}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={saveProfile}>
                                <div className="row g-2">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Nome</label>
                                        <input
                                            className="form-control"
                                            name="firstName"
                                            value={profile.firstName}
                                            onChange={onProfileChange}
                                            onBlur={(e) =>
                                                setProfile((prev) => ({
                                                    ...prev,
                                                    firstName: normalizeHumanText(e.target.value),
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Cognome</label>
                                        <input
                                            className="form-control"
                                            name="lastName"
                                            value={profile.lastName}
                                            onChange={onProfileChange}
                                            onBlur={(e) =>
                                                setProfile((prev) => ({
                                                    ...prev,
                                                    lastName: normalizeHumanText(e.target.value),
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Telefono</label>
                                        <input className="form-control" name="phone" value={profile.phone} onChange={onProfileChange} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Email</label>
                                        <input className="form-control" value={currentUser?.email || ""} disabled />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Tipo</label>
                                        <input className="form-control" value={currentUser?.customerType === "piva" ? "P.IVA" : "Privato"} disabled />
                                    </div>
                                </div>

                                <hr />

                                <div className="fw-semibold mb-2">Fatturazione</div>

                                {currentUser?.customerType === "piva" ? (
                                    <>
                                        <div className="row g-2">
                                            <div className="col-12">
                                                <label className="form-label">Ragione sociale</label>
                                                <input
                                                    className="form-control"
                                                    name="companyName"
                                                    value={profile.companyName}
                                                    onChange={onProfileChange}
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label">Partita IVA</label>
                                                <input
                                                    className="form-control"
                                                    name="vatNumber"
                                                    value={profile.vatNumber}
                                                    onChange={onProfileChange}
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label">Codice fiscale</label>
                                                <input
                                                    className="form-control"
                                                    name="taxCode"
                                                    value={profile.taxCode}
                                                    onChange={(e) =>
                                                        setProfile((prev) => ({
                                                            ...prev,
                                                            taxCode: String(e.target.value || "").toUpperCase(),
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label">Indirizzo sede legale</label>
                                                <input
                                                    className="form-control"
                                                    name="billingAddress"
                                                    value={profile.billingAddress}
                                                    onChange={onProfileChange}
                                                />
                                            </div>

                                            <div className="col-12 col-md-4">
                                                <label className="form-label">N° civico</label>
                                                <input
                                                    className="form-control"
                                                    name="billingStreetNumber"
                                                    value={profile.billingStreetNumber}
                                                    onChange={onProfileChange}
                                                />
                                            </div>

                                            <div className="col-12 col-md-5">
                                                <label className="form-label">Città</label>
                                                <input
                                                    className="form-control"
                                                    name="billingCity"
                                                    value={profile.billingCity}
                                                    onChange={onProfileChange}
                                                    onBlur={(e) =>
                                                        setProfile((prev) => ({
                                                            ...prev,
                                                            billingCity: normalizeHumanText(e.target.value),
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="col-12 col-md-3">
                                                <label className="form-label">CAP</label>
                                                <input
                                                    className="form-control"
                                                    name="billingCap"
                                                    value={profile.billingCap}
                                                    onChange={onProfileChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-text mt-2">
                                            Questa sede legale è separata dagli indirizzi di spedizione e verrà usata per la fatturazione della Partita IVA.
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-muted" style={{ fontSize: 13 }}>
                                            Intestatario fattura: <strong>{profile.firstName} {profile.lastName}</strong>
                                        </div>

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
                                    </>
                                )}

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

                        {currentUser?.customerType === "piva" ? (
                            <div className="text-muted mb-2" style={{ fontSize: 13 }}>
                                Gli indirizzi qui sotto servono solo per la spedizione. La sede legale di fatturazione si gestisce sopra.
                            </div>
                        ) : null}

                        {addrError ? (
                            <div className="alert alert-danger py-2" role="alert">
                                {addrError}
                            </div>
                        ) : null}

                        {addrLoading ? (
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                Carico indirizzi...
                            </div>
                        ) : shippingAddresses.length === 0 ? (
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                Nessun indirizzo salvato.
                            </div>
                        ) : (
                            <div className="list-group">
                                {shippingAddresses.map((a) => {
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

                                                <div className="d-flex flex-column align-items-stretch gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm shop-edit-btn"
                                                        onClick={() =>
                                                            editingAddressId === String(a._id)
                                                                ? cancelEditAddress()
                                                                : startEditAddress(a)
                                                        }
                                                        disabled={addrBusyId === a._id || editAddrSubmitting}
                                                    >
                                                        {editingAddressId === String(a._id) ? "Chiudi modifica" : "Modifica"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleDeleteAddress(a._id)}
                                                        disabled={addrBusyId === a._id || editAddrSubmitting}
                                                    >
                                                        {addrBusyId === a._id ? "..." : "Elimina"}
                                                    </button>

                                                    {!a.isDefault ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm shop-edit-btn"
                                                            onClick={() => makeDefaultAddress(a._id)}
                                                            disabled={addrBusyId === a._id || editAddrSubmitting}
                                                        >
                                                            {addrBusyId === a._id ? "..." : "Imposta come predefinito"}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {editingAddressId === String(a._id) ? (
                                                <form className="mt-3 pt-3 border-top" onSubmit={submitEditAddress}>
                                                    {editAddrError ? (
                                                        <div className="alert alert-danger py-2" role="alert">
                                                            {editAddrError}
                                                        </div>
                                                    ) : null}

                                                    <div className="row g-2">
                                                        <div className="col-12 col-md-6">
                                                            <label className="form-label">Nome</label>
                                                            <input
                                                                className="form-control"
                                                                name="name"
                                                                value={editAddr.name}
                                                                onChange={onEditAddrChange}
                                                                onBlur={(e) =>
                                                                    setEditAddr((prev) => ({
                                                                        ...prev,
                                                                        name: normalizeHumanText(e.target.value),
                                                                    }))
                                                                }
                                                            />
                                                        </div>

                                                        <div className="col-12 col-md-6">
                                                            <label className="form-label">Cognome</label>
                                                            <input
                                                                className="form-control"
                                                                name="surname"
                                                                value={editAddr.surname}
                                                                onChange={onEditAddrChange}
                                                                onBlur={(e) =>
                                                                    setEditAddr((prev) => ({
                                                                        ...prev,
                                                                        surname: normalizeHumanText(e.target.value),
                                                                    }))
                                                                }
                                                            />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label">Telefono</label>
                                                            <input
                                                                className="form-control"
                                                                name="phone"
                                                                value={editAddr.phone}
                                                                onChange={onEditAddrChange}
                                                            />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label">Indirizzo</label>
                                                            <input
                                                                className="form-control"
                                                                name="address"
                                                                value={editAddr.address}
                                                                onChange={onEditAddrChange}
                                                            />
                                                        </div>

                                                        <div className="col-12 col-md-4">
                                                            <label className="form-label">N° civico</label>
                                                            <input
                                                                className="form-control"
                                                                name="streetNumber"
                                                                value={editAddr.streetNumber}
                                                                onChange={onEditAddrChange}
                                                            />
                                                        </div>

                                                        <div className="col-12 col-md-5">
                                                            <label className="form-label">Città</label>
                                                            <input
                                                                className="form-control"
                                                                name="city"
                                                                value={editAddr.city}
                                                                onChange={onEditAddrChange}
                                                                onBlur={(e) =>
                                                                    setEditAddr((prev) => ({
                                                                        ...prev,
                                                                        city: normalizeHumanText(e.target.value),
                                                                    }))
                                                                }
                                                            />
                                                        </div>

                                                        <div className="col-12 col-md-3">
                                                            <label className="form-label">CAP</label>
                                                            <input
                                                                className="form-control"
                                                                name="cap"
                                                                value={editAddr.cap}
                                                                onChange={onEditAddrChange}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="d-flex gap-2 mt-3">
                                                        <button className="btn btn-primary btn-sm" type="submit" disabled={editAddrSubmitting}>
                                                            {editAddrSubmitting ? "Salvo..." : "Salva modifiche"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={cancelEditAddress}
                                                            disabled={editAddrSubmitting}
                                                        >
                                                            Annulla
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : null}
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
                                            <input
                                                className="form-control"
                                                name="name"
                                                value={newAddr.name}
                                                onChange={onNewAddrChange}
                                                onBlur={(e) =>
                                                    setNewAddr((prev) => ({
                                                        ...prev,
                                                        name: normalizeHumanText(e.target.value),
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="form-label">Cognome</label>
                                            <input
                                                className="form-control"
                                                name="surname"
                                                value={newAddr.surname}
                                                onChange={onNewAddrChange}
                                                onBlur={(e) =>
                                                    setNewAddr((prev) => ({
                                                        ...prev,
                                                        surname: normalizeHumanText(e.target.value),
                                                    }))
                                                }
                                            />
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
                                            <input
                                                className="form-control"
                                                name="city"
                                                value={newAddr.city}
                                                onChange={onNewAddrChange}
                                                onBlur={(e) =>
                                                    setNewAddr((prev) => ({
                                                        ...prev,
                                                        city: normalizeHumanText(e.target.value),
                                                    }))
                                                }
                                            />
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
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type={showLoginPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary shop-eye-btn"
                                    onClick={() => setShowLoginPassword((v) => !v)}
                                    aria-label={showLoginPassword ? "Nascondi password" : "Mostra password"}
                                >
                                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

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
        </>
    );
}
