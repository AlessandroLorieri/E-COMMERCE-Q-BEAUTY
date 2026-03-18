import { Helmet } from "react-helmet-async";

const SITE_NAME = "Q•BEAUTY";
const SITE_URL = String(import.meta.env.VITE_SITE_URL || "https://qbeautyshop.it").replace(/\/+$/, "");

const DEFAULT_TITLE = "Q•BEAUTY | Pedicure professionale e cura del piede";
const DEFAULT_DESCRIPTION =
    "Q•BEAUTY è una linea professionale per pedicure: prodotti di alta qualità, identità forte e shop online dedicato alla cura del piede.";
const DEFAULT_IMAGE = "/img/last.jpg";

function toAbsoluteUrl(value) {
    const raw = String(value || "").trim();

    if (!raw) return SITE_URL;
    if (/^https?:\/\//i.test(raw)) return raw;

    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${SITE_URL}${path}`;
}

function buildTitle(title) {
    const t = String(title || "").trim();

    if (!t) return DEFAULT_TITLE;
    if (t.toLowerCase().includes("q•beauty") || t.toLowerCase().includes("qbeauty")) return t;

    return `${t} | ${SITE_NAME}`;
}

export default function Seo({
    title,
    description = DEFAULT_DESCRIPTION,
    canonical = "/",
    image = DEFAULT_IMAGE,
    type = "website",
    robots,
    noindex = false,
    structuredData = null,
}) {
    const finalTitle = buildTitle(title);
    const finalDescription = String(description || DEFAULT_DESCRIPTION).trim();
    const finalCanonical = toAbsoluteUrl(canonical);
    const finalImage = toAbsoluteUrl(image);
    const finalRobots = String(
        robots || (noindex ? "noindex, nofollow" : "index, follow")
    ).trim();

    return (
        <Helmet prioritizeSeoTags>
            <title>{finalTitle}</title>

            <meta name="description" content={finalDescription} />
            <meta name="robots" content={finalRobots} />
            <link rel="canonical" href={finalCanonical} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="it_IT" />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:url" content={finalCanonical} />
            <meta property="og:image" content={finalImage} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={finalImage} />

            {structuredData ? (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            ) : null}
        </Helmet>
    );
}