import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo";

import "./PartnerDetailPage.css";

function renderServices(services = []) {
    return services.join(" • ");
}

export default function PartnerDetailPage() {
    const { slug } = useParams();
    const timerRef = useRef(null);

    const apiBase = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const galleryImages = useMemo(() => {
        if (!partner) return [];
        if (Array.isArray(partner.gallery) && partner.gallery.length > 0) {
            return partner.gallery.filter(Boolean);
        }
        return partner.image ? [partner.image] : [];
    }, [partner]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [nextImageIndex, setNextImageIndex] = useState(null);
    const [isImageTransitioning, setIsImageTransitioning] = useState(false);

    useEffect(() => {
        let alive = true;

        async function loadPartner() {
            if (!apiBase) {
                setError("VITE_API_URL mancante");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const res = await fetch(`${apiBase}/api/partners/slug/${encodeURIComponent(slug)}`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    if (res.status === 404) {
                        if (!alive) return;
                        setPartner(null);
                        setLoading(false);
                        return;
                    }
                    throw new Error(data?.message || "Errore caricamento partner");
                }

                if (!alive) return;
                setPartner(data || null);
            } catch (err) {
                if (!alive) return;
                setError(err.message || "Errore caricamento partner");
                setPartner(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        loadPartner();

        return () => {
            alive = false;
        };
    }, [apiBase, slug]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setCurrentImageIndex(0);
        setNextImageIndex(null);
        setIsImageTransitioning(false);

        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }
    }, [partner?._id, partner?.id]);

    useEffect(() => {
        if (!galleryImages.length) return;

        galleryImages.forEach((src) => {
            const img = new window.Image();
            img.src = src;
        });
    }, [galleryImages]);

    if (!loading && !error && !partner) {
        return <Navigate to="/partners" replace />;
    }

    const currentImageSrc = galleryImages[currentImageIndex] || partner?.image || "";
    const nextImageSrc =
        nextImageIndex !== null ? galleryImages[nextImageIndex] || "" : "";

    function goToImage(targetIndex) {
        if (galleryImages.length <= 1) return;
        if (isImageTransitioning) return;
        if (targetIndex === currentImageIndex) return;

        const targetSrc = galleryImages[targetIndex];
        if (!targetSrc) return;

        const preloadImg = new window.Image();

        preloadImg.onload = () => {
            setNextImageIndex(targetIndex);

            window.requestAnimationFrame(() => {
                setIsImageTransitioning(true);
            });

            timerRef.current = window.setTimeout(() => {
                setCurrentImageIndex(targetIndex);
                setNextImageIndex(null);
                setIsImageTransitioning(false);
            }, 420);
        };

        preloadImg.onerror = () => {
            setCurrentImageIndex(targetIndex);
            setNextImageIndex(null);
            setIsImageTransitioning(false);
        };

        preloadImg.src = targetSrc;
    }

    function goPrevImage() {
        if (galleryImages.length <= 1) return;
        const prevIndex =
            currentImageIndex === 0
                ? galleryImages.length - 1
                : currentImageIndex - 1;
        goToImage(prevIndex);
    }

    function goNextImage() {
        if (galleryImages.length <= 1) return;
        const followingIndex =
            currentImageIndex === galleryImages.length - 1
                ? 0
                : currentImageIndex + 1;
        goToImage(followingIndex);
    }

    return (
        <>
            <Seo
                title={
                    partner?.name
                        ? `${partner.name} | Partner Q•BEAUTY`
                        : "Partner Q•BEAUTY"
                }
                description={
                    partner?.city
                        ? `Scopri ${partner.name}, partner Q•BEAUTY a ${partner.city}.`
                        : "Scopri i partner Q•BEAUTY."
                }
                canonical={partner?.slug ? `/partners/${partner.slug}` : "/partners"}
            />

            <div className="partner-detail-page">
                <div className="container py-5 partner-detail-page__container">
                    <div className="mb-4">
                        <Link to="/partners" className="btn btn-sm partner-detail-page__back">
                            ← Torna ai partner
                        </Link>
                    </div>

                    {loading ? (
                        <div className="text-center text-light py-5">
                            Carico partner...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    ) : partner ? (
                        <>
                            <section className="partner-detail-hero">
                                <div className="row g-0">
                                    <div className="col-12 col-lg-5">
                                        <div className="partner-detail-hero__image">
                                            <div
                                                className="partner-detail-hero__image-layer is-current"
                                                style={{
                                                    backgroundImage: `url(${currentImageSrc})`,
                                                }}
                                            />

                                            {nextImageSrc ? (
                                                <div
                                                    className={`partner-detail-hero__image-layer is-next ${isImageTransitioning ? "is-visible" : ""}`}
                                                    style={{
                                                        backgroundImage: `url(${nextImageSrc})`,
                                                    }}
                                                />
                                            ) : null}

                                            {galleryImages.length > 1 ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="partner-detail-hero__nav partner-detail-hero__nav--prev"
                                                        onClick={goPrevImage}
                                                        aria-label="Immagine precedente"
                                                    >
                                                        ‹
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="partner-detail-hero__nav partner-detail-hero__nav--next"
                                                        onClick={goNextImage}
                                                        aria-label="Immagine successiva"
                                                    >
                                                        ›
                                                    </button>

                                                    <div className="partner-detail-hero__dots">
                                                        {galleryImages.map((_, index) => (
                                                            <button
                                                                key={`${partner._id || partner.id || partner.slug}-dot-${index}`}
                                                                type="button"
                                                                className={`partner-detail-hero__dot ${index === currentImageIndex ? "is-active" : ""}`}
                                                                onClick={() => goToImage(index)}
                                                                aria-label={`Vai immagine ${index + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="col-12 col-lg-7">
                                        <div className="p-4 p-lg-5 h-100 d-flex flex-column partner-detail-hero__content">
                                            <h1 className="partner-detail-hero__title">
                                                {partner.name}
                                            </h1>

                                            <div className="partner-detail-hero__meta">
                                                {partner.city} ({partner.province}) · {partner.region}
                                            </div>

                                            <div className="row g-3">
                                                <div className="col-12 col-md-6">
                                                    <div className="partner-detail-info-box">
                                                        <div className="partner-detail-info-box__label">
                                                            Servizi
                                                        </div>

                                                        <div className="partner-detail-info-box__value">
                                                            {renderServices(partner.services)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <div className="partner-detail-info-box">
                                                        <div className="partner-detail-info-box__label">
                                                            Dove si trova
                                                        </div>

                                                        <div className="partner-detail-info-box__value">
                                                            {partner.address}
                                                            <br />
                                                            {partner.city} ({partner.province})
                                                            {partner.cap ? `, ${partner.cap}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-2">
                                                <div className="partner-detail-contact-label">
                                                    Contatti
                                                </div>

                                                {partner.phone ? (
                                                    <div className="partner-detail-contact-item">
                                                        <strong>Telefono:</strong> {partner.phone}
                                                    </div>
                                                ) : null}

                                                {partner.email ? (
                                                    <div className="partner-detail-contact-item">
                                                        <strong>Email:</strong> {partner.email}
                                                    </div>
                                                ) : null}

                                                {partner.website ? (
                                                    <div className="partner-detail-contact-item">
                                                        <strong>Sito:</strong>{" "}
                                                        <a
                                                            href={partner.website}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {partner.website}
                                                        </a>
                                                    </div>
                                                ) : null}

                                                {partner.instagram ? (
                                                    <div className="partner-detail-contact-item">
                                                        <strong>Instagram:</strong>{" "}
                                                        <a
                                                            href={partner.instagram}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {partner.instagram}
                                                        </a>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="row g-4">
                                <div className="col-12 col-lg-7">
                                    <div className="partner-detail-secondary-box">
                                        <div className="partner-detail-secondary-box__label">
                                            Il centro
                                        </div>

                                        <h2 className="partner-detail-secondary-box__title">
                                            Esperienza partner Q•BEAUTY
                                        </h2>

                                        <p className="partner-detail-secondary-box__text">
                                            {partner.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-12 col-lg-5">
                                    <div className="partner-detail-secondary-box">
                                        <div className="partner-detail-secondary-box__label">
                                            Mappa
                                        </div>

                                        <h2 className="partner-detail-secondary-box__title">
                                            Dove trovarlo
                                        </h2>

                                        <div className="partner-detail-map">
                                            <div className="partner-detail-map__label">
                                                MAPPA PARTNER
                                            </div>

                                            <div className="partner-detail-map__marker" />
                                        </div>

                                        <p className="mb-0 partner-detail-secondary-box__text">
                                            Qui possiamo inserire la Google Map reale del singolo partner,
                                            con puntino posizione e collegamento rapido alle indicazioni.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>
            </div>
        </>
    );
}