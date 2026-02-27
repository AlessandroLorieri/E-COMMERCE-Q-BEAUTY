// src/BlackFridayBanner.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./BlackFriday.css";

// Piccola icona Instagram in SVG
function InstagramIcon() {
  return (
    <svg
      className="bf-ig-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bf-ig-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="30%" stopColor="#dd2a7b" />
          <stop offset="60%" stopColor="#8134af" />
          <stop offset="100%" stopColor="#515bd4" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        ry="6"
        fill="url(#bf-ig-gradient)"
      />
      <circle cx="12" cy="12" r="5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="1.2" fill="#fff" />
    </svg>
  );
}

const bfProducts = [
  {
    name: "Spray Igienizzante",
    desc: "Step 1 · Apre in trattamento, igienizza, deodora e idrata",
    oldPrice: "€17,90",
    newPrice: "€14,30",
    discount: "-20%",
    link: "/prodotti/Spray",
    img: "/img/spray1.jpg",
  },
  {
    name: "Burro Emolliente",
    desc:
      "Step 2 · Azione emolliente e levigante, idrata e sigilla il tessuto per un effetto Photoshop",
    oldPrice: "€24,90",
    newPrice: "€19,90",
    discount: "-20%",
    highlight: true,
    link: "/prodotti/Olio",
    img: "/img/burro_emoliente.jpg",
  },
  {
    name: "Crema Piedi",
    desc:
      "Step 3 · Idrata in profondità ed esfolia la pelle, perfetta chiusura del trattamento e come trattamento domiciliare",
    oldPrice: "€24,90",
    newPrice: "€19,90",
    discount: "-20%",
    link: "/prodotti/Siero",
    img: "/img/crema_piedi.jpg",
  },
];

function BlackFridayBanner() {
  return (
    <section className="bf-banner">
      <div className="bf-banner__content">
        <div className="bf-badge">Q•BEAUTY</div>

        {/* Riga Instagram sotto il badge */}
        <p className="bf-ig-follow">
          Resta aggiornato, seguici su Instagram{" "}
          <a
            href="https://www.instagram.com/q.beauty_pedicurexperience/"
            target="_blank"
            rel="noopener noreferrer"
            className="bf-ig-link"
          >
            <InstagramIcon />
            <span className="bf-ig-text">@q.beauty_pedicurexperience</span>
          </a>
        </p>

        <h2 className="bf-title">BLACK FRIDAY Q•BEAUTY</h2>

        <p className="bf-subtitle">
          Solo per 24 ore, Venerdì 28 Novembre tutti i prodotti Q•BEAUTY{" "}
          <strong>scontati del -20%</strong>
        </p>

        <div className="bf-cards">
          {bfProducts.map((p) => (
            <article
              key={p.name}
              className={`bf-card ${p.highlight ? "bf-card--highlight" : ""}`}
            >
              <div className="bf-card__ribbon">{p.discount}</div>

              {/* FOTO PRODOTTO */}
              <div className="bf-card__image-wrapper">
                <img src={p.img} alt={p.name} className="bf-card__image" />
              </div>

              <h3 className="bf-card__title">{p.name}</h3>
              <p className="bf-card__desc">{p.desc}</p>

              <div className="bf-card__price">
                <span className="bf-card__old">{p.oldPrice}</span>
                <span className="bf-card__new">{p.newPrice}</span>
              </div>

              <Link to={p.link} className="bf-card__btn">
                Vedi dettagli
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BlackFridayBanner;
