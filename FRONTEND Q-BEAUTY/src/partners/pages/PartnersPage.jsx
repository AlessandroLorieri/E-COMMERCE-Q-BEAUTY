import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/Seo";

import "./PartnersPage.css";

function renderServices(services = []) {
    return services.join(" • ");
}

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-public-partners-script";

function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
        if (window.google?.maps) {
            resolve(window.google.maps);
            return;
        }

        const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
        if (existing) {
            existing.addEventListener("load", () => resolve(window.google.maps));
            existing.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google.maps);
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

function PartnersMap({ partners = [], onFilterPartner }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!apiKey) return;

        let cancelled = false;

        async function initMap() {
            try {
                await loadGoogleMaps(apiKey);

                if (cancelled) return;

                const validPartners = partners
                    .map((partner) => ({
                        ...partner,
                        latNumber: Number(String(partner.lat || "").replace(",", ".")),
                        lngNumber: Number(String(partner.lng || "").replace(",", ".")),
                    }))
                    .filter((partner) =>
                        Number.isFinite(partner.latNumber) &&
                        Number.isFinite(partner.lngNumber)
                    );

                const fallbackCenter = { lat: 44.8015, lng: 10.3279 };

                const map = new window.google.maps.Map(
                    document.getElementById("partnersPublicMap"),
                    {
                        center: validPartners.length
                            ? { lat: validPartners[0].latNumber, lng: validPartners[0].lngNumber }
                            : fallbackCenter,
                        zoom: validPartners.length ? 7 : 6,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                    }
                );

                const bounds = new window.google.maps.LatLngBounds();
                const infoWindow = new window.google.maps.InfoWindow();

                validPartners.forEach((partner) => {
                    const position = {
                        lat: partner.latNumber,
                        lng: partner.lngNumber,
                    };

                    const markerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="38" height="56" viewBox="0 0 38 56">
  <defs>
    <linearGradient id="gold" x1="8" y1="4" x2="30" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff1b8"/>
      <stop offset="0.48" stop-color="#debe68"/>
      <stop offset="1" stop-color="#9f7f2f"/>
    </linearGradient>

    <radialGradient id="innerGlow" cx="50%" cy="38%" r="65%">
      <stop offset="0" stop-color="#24211a"/>
      <stop offset="1" stop-color="#090909"/>
    </radialGradient>

    <filter id="softShadow" x="-35%" y="-25%" width="170%" height="170%">
      <feDropShadow dx="0" dy="7" stdDeviation="4" flood-color="#000000" flood-opacity="0.34"/>
    </filter>
  </defs>

  <path
    filter="url(#softShadow)"
    d="M19 2.5C10.2 2.5 3.1 9.6 3.1 18.4c0 13.6 15.9 33.9 15.9 33.9s15.9-20.3 15.9-33.9C34.9 9.6 27.8 2.5 19 2.5z"
    fill="url(#gold)"
    stroke="#fff8de"
    stroke-width="1.6"
  />

  <circle
    cx="19"
    cy="18.4"
    r="8.2"
    fill="url(#innerGlow)"
    stroke="rgba(255,248,222,0.9)"
    stroke-width="1.2"
  />

  <circle
    cx="19"
    cy="18.4"
    r="5.4"
    fill="none"
    stroke="rgba(222,190,104,0.45)"
    stroke-width="1"
  />

<g>
  <path
    d="M18.9 14.4
       C16.4 14.4 14.4 16.2 14.4 18.4
       C14.4 20.7 16.3 22.4 18.9 22.4
       C21.5 22.4 23.4 20.7 23.4 18.4
       C23.4 16.2 21.4 14.4 18.9 14.4
       Z"
    fill="none"
    stroke="#debe68"
    stroke-width="1.25"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

<path
  d="M19.6 22.4 L26.8 22.4"
  fill="none"
  stroke="#debe68"
  stroke-width="1.25"
  stroke-linecap="round"
/>
</g>
</svg>
`;

                    const marker = new window.google.maps.Marker({
                        position,
                        map,
                        title: partner.name || "Partner Q•BEAUTY",
                        icon: {
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
                            scaledSize: new window.google.maps.Size(38, 56),
                            anchor: new window.google.maps.Point(19, 56),
                        },
                    });

                    bounds.extend(position);

                    marker.addListener("click", () => {
                        const partnerId = String(partner._id || partner.slug || "");

                        map.setZoom(14);

                        window.setTimeout(() => {
                            map.panTo(position);
                        }, 180);

                        if (typeof onFilterPartner === "function") {
                            onFilterPartner(partnerId);
                        }

                        infoWindow.setContent(`
                        <div style="max-width:220px">
                        <strong>${partner.name || "Partner Q•BEAUTY"}</strong>
                        <div>${partner.city || ""}${partner.province ? ` (${partner.province})` : ""}</div>
                        <div style="margin-top:6px">${partner.address || ""}</div>
                        </div>
                        `);
                        infoWindow.open(map, marker);
                    });
                });

                infoWindow.addListener("closeclick", () => {
                    if (typeof onFilterPartner === "function") {
                        onFilterPartner("");
                    }

                    if (validPartners.length > 1) {
                        map.fitBounds(bounds);
                    } else if (validPartners.length === 1) {
                        map.panTo({
                            lat: validPartners[0].latNumber,
                            lng: validPartners[0].lngNumber,
                        });
                        map.setZoom(13);
                    } else {
                        map.panTo(fallbackCenter);
                        map.setZoom(6);
                    }
                });

                if (validPartners.length > 1) {
                    map.fitBounds(bounds);
                } else if (validPartners.length === 1) {
                    map.setCenter({
                        lat: validPartners[0].latNumber,
                        lng: validPartners[0].lngNumber,
                    });
                    map.setZoom(13);
                }
            } catch (err) {
                console.error("Errore caricamento Google Maps:", err);
            }
        }

        initMap();

        return () => {
            cancelled = true;
        };
    }, [apiKey, partners, onFilterPartner]);

    if (!apiKey) return null;

    return (
        <div className="partners-public-map-wrap">
            <div id="partnersPublicMap" className="partners-public-map" />
        </div>
    );
}

export default function PartnersPage() {
    const apiBase = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filteredPartnerId, setFilteredPartnerId] = useState("");

    const visiblePartners = filteredPartnerId
        ? partners.filter((partner) => String(partner._id || partner.slug || "") === String(filteredPartnerId))
        : partners;

    useEffect(() => {
        let alive = true;

        async function loadPartners() {
            if (!apiBase) {
                setError("VITE_API_URL mancante");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const res = await fetch(`${apiBase}/api/partners`);
                const data = await res.json().catch(() => ([]));

                if (!res.ok) {
                    throw new Error(data?.message || "Errore caricamento partner");
                }

                if (!alive) return;
                setPartners(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!alive) return;
                setError(err.message || "Errore caricamento partner");
                setPartners([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        loadPartners();

        return () => {
            alive = false;
        };
    }, [apiBase]);

    return (
        <>
            <Seo
                title="Partner Q•BEAUTY | Dove trovarci in Italia"
                description="Scopri dove trovare i prodotti e i trattamenti Q•BEAUTY in Italia."
                canonical="/partners"
            />

            <div className="partners-page">
                <div className="container py-5 partners-page__container">
                    <div className="partners-page__back-wrap">
                        <Link to="/" className="partners-page__back">
                            ← Torna alla Home
                        </Link>
                    </div>

                    <section className="mb-5 text-center">
                        <div className="mx-auto partners-page__intro">
                            <span className="d-inline-block mb-3 partners-page__eyebrow">
                                Partner Q•BEAUTY
                            </span>

                            <h1 className="mb-3">Dove trovare Q•BEAUTY in Italia</h1>

                            <p className="mb-0 partners-page__lead">
                                Scopri i partner Q•BEAUTY presenti in Italia, dove trovare i nostri
                                prodotti e i trattamenti disponibili sul territorio.
                            </p>
                        </div>
                    </section>

                    {!loading && !error && partners.length > 0 ? (
                        <section className="mb-5 px-3 px-lg-5">
                            <PartnersMap
                                partners={partners}
                                onFilterPartner={setFilteredPartnerId}
                            />
                        </section>
                    ) : null}

                    <section className="d-flex flex-column gap-4 px-3 px-lg-5">

                        {filteredPartnerId ? (
                            <div className="text-center text-light mb-2" style={{ fontSize: 14 }}>
                                Partner selezionato dalla mappa. Chiudi il popup sulla mappa per vedere di nuovo tutti i partner.
                            </div>
                        ) : null}

                        {loading ? (
                            <div className="text-center text-light py-5">
                                Carico partner...
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        ) : partners.length === 0 ? (
                            <div className="text-center text-light py-5">
                                Nessun partner disponibile.
                            </div>
                        ) : (
                            visiblePartners.map((partner) => (
                                <article key={partner._id || partner.slug} className="partner-card">
                                    <div className="row g-0">
                                        <div className="col-12 col-lg-4">
                                            <div
                                                className="partner-card__image"
                                                style={{
                                                    backgroundImage: `url(${partner.image})`,
                                                }}
                                            />
                                        </div>

                                        <div className="col-12 col-lg-8">
                                            <div className="p-4 p-lg-5 h-100 d-flex flex-column partner-card__content">
                                                <h2 className="partner-card__title">
                                                    {partner.name}
                                                </h2>

                                                <div className="partner-card__meta">
                                                    {partner.city} ({partner.province}) · {partner.region}
                                                </div>

                                                <div className="mb-2">
                                                    <strong>Servizi:</strong> {renderServices(partner.services)}
                                                </div>

                                                <div className="mb-2">
                                                    <strong>Indirizzo:</strong> {partner.address}
                                                </div>

                                                {partner.phone ? (
                                                    <div className="mb-2">
                                                        <strong>Telefono:</strong> {partner.phone}
                                                    </div>
                                                ) : null}

                                                {partner.email ? (
                                                    <div className="mb-4">
                                                        <strong>Email:</strong> {partner.email}
                                                    </div>
                                                ) : null}

                                                <div className="mt-auto pt-2">
                                                    <Link
                                                        to={`/partners/${partner.slug}`}
                                                        className="btn partner-card__button"
                                                    >
                                                        Scopri di più
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}