import { Link } from "react-router-dom";
import Seo from "./components/Seo";

const pageBg = {
    minHeight: "100vh",
    backgroundColor: "#000",
    backgroundImage: 'url("/img/black2.png")',
    backgroundPosition: "center top",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    padding: "32px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const cardStyle = {
    maxWidth: 760,
    width: "100%",
    background: "rgba(10, 10, 14, 0.88)",
    border: "1px solid rgba(222, 190, 104, 0.24)",
    borderRadius: 24,
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
    padding: "42px 26px",
    textAlign: "center",
    backdropFilter: "blur(4px)",
};

const eyebrowStyle = {
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(222, 190, 104, 0.72)",
    marginBottom: 12,
};

const titleStyle = {
    color: "#f3e9c6",
    margin: "0 0 14px",
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.1,
};

const textStyle = {
    color: "rgba(243, 233, 198, 0.82)",
    margin: "0 auto 26px",
    lineHeight: 1.6,
    maxWidth: 560,
};

const actionsStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
};

const primaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
    padding: "12px 18px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 700,
    background: "linear-gradient(180deg, #debe68, #c79d3b)",
    color: "#111",
    border: "1px solid rgba(0,0,0,0.16)",
};

const secondaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
    padding: "12px 18px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 700,
    background: "transparent",
    color: "#f3e9c6",
    border: "1px solid rgba(222, 190, 104, 0.28)",
};

export default function NotFoundPage() {
    return (
        <>
            <Seo
                title="Pagina non trovata | Q•BEAUTY"
                description="La pagina richiesta non esiste o non è più disponibile."
                canonical="/404"
                noindex
            />

            <div style={pageBg}>
                <div style={cardStyle}>
                    <div style={eyebrowStyle}>Errore 404</div>

                    <h1 style={titleStyle}>Pagina non trovata</h1>

                    <p style={textStyle}>
                        La pagina che stai cercando non esiste, è stata spostata oppure
                        l’indirizzo non è corretto.
                    </p>

                    <div style={actionsStyle}>
                        <Link to="/" style={primaryBtnStyle}>
                            Vai alla home
                        </Link>

                        <Link to="/shop" style={secondaryBtnStyle}>
                            Vai allo shop
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}