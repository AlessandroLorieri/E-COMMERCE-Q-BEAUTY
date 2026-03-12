import "./HomePromoBanner.css";

const MARQUEE_ITEMS = [
    "PRIVATI: -10% SUL PRIMO ACQUISTO",
    "P.IVA: -15% FISSO",
    "-25% SU 30 O PIU' PEZZI",
    "SPEDIZIONE GRATUITA SOPRA I 120€",
];

export default function HomePromoBanner() {
    const loopItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

    return (
        <section className="shop-marquee-banner" aria-label="Banner promozionale scorrevole">
            <div className="shop-marquee-banner__line shop-marquee-banner__line--top" />

            <div className="shop-marquee-banner__viewport">
                <div className="shop-marquee-banner__track">
                    {loopItems.map((item, index) => (
                        <div
                            key={`${item}-${index}`}
                            className="shop-marquee-banner__item"
                            aria-hidden={index >= MARQUEE_ITEMS.length ? "true" : "false"}
                        >
                            <span className="shop-marquee-banner__text">{item}</span>
                            <span className="diamond_small" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="shop-marquee-banner__line shop-marquee-banner__line--bottom" />
        </section>
    );
}