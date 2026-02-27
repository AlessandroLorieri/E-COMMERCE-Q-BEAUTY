// src/prodotti/Olio.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

function ProdottoOlio() {
  return (
    <main className="product-page">
      <h1 className="product-title">BURRO EMOLLIENTE LEVIGANTE</h1>

      <div className="product-card">
        <div className="product-image">
          {/* dal public */}
          <img src="/img/burro_emoliente.jpg" alt="Burro Emolliente" />
          <img
            src="/img/img_5514.jpg"
            alt="Burro Emolliente Q.BEAUTY"
            style={{ marginTop: "1rem", borderRadius: "10px", maxWidth: "100%" }}
          />
        </div>

        <div className="product-details">
          <p>
            Il secondo prodotto della linea <strong>Q.BEAUTY</strong> è il
            burro emolliente levigante. Un prodotto amatissimo per le sue
            proprietà emollienti, idratanti e leviganti.
          </p>

          <ul>
            <li><strong>BURRO DI KARITÈ e CACAO:</strong> Emollienti e nutrienti che proteggono e idratano</li>
            <li><strong>CERA CARNAUBA:</strong> Ammorbidisce la pelle secca e ruvida</li>
            <li><strong>OLIO DI CAMELINA:</strong> Antiossidante, ricco di Vitamina E</li>
            <li><strong>OLIO DI MANDORLE DOLCI e RICINO:</strong> Idratanti e protettivi</li>
            <li><strong>OLIO DI VASELINA:</strong> Lubrificante e protettivo</li>
            <li><strong>VITAMINA E:</strong> Potente antiossidante</li>
            <li><strong>PROFUMO:</strong> Dolce, floreale, avvolgente</li>
          </ul>

          <p>
            <strong>Modalità d’uso:</strong> Applicare dopo la levigatura degli ispessimenti.
            Usare una piccola quantità su zone secche, anche con strumenti professionali.
          </p>

          <ul>
            <li>Made in Italy 🇮🇹</li>
            <li>Cruelty Free 🐰</li>
            <li>Vegan 🌿</li>
            <li>76% ingredienti di origine naturale 🌱</li>
          </ul>
          <div style={{ marginTop: "2rem", fontSize: "1.3rem", lineHeight: "1.6" }}>
            <p><strong>💰 Prezzo:</strong> € 24,90</p>
            <p>🔹 <strong>-10%</strong> sul primo acquisto → <strong>€ 22,40</strong></p>
            <p>🔹 <strong>-15%</strong> FISSO per le P. IVA → <strong>€ 21 IVA incl.</strong></p>
          </div>
        </div>
      </div>

      <Link to="/home" className="cta-button" style={{ display: "inline-block", marginTop: "2rem" }}>
        ← Torna alla Home
      </Link>
    </main>
  );
}

export default ProdottoOlio;
