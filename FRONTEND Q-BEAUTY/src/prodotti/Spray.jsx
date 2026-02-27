// src/prodotti/Spray.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

function Spray() {
  return (
    <main className="product-page">
      <h1 className="product-title">Spray Igienizzante</h1>

      <div className="product-card">
        <div className="product-image">
          {/* immagini dal public */}
          <img src="/img/spray1.jpg" alt="Spray Igienizzante" />
          <img
            src="/img/img_5505.jpg"
            alt="Uso dello spray sui piedi"
            style={{ marginTop: '1rem', borderRadius: '10px', maxWidth: '100%' }}
          />
        </div>

        <div className="product-details">
          <p>
            Il primo prodotto della linea <strong>Q.BEAUTY</strong> è lo spray igienizzante…
          </p>

          <ul>
            <li><strong>ALCOOL DENATURATO:</strong> Azione disinfettante e antibatterica</li>
            <li><strong>ACQUA DI CAMOMILLA E MALVA:</strong> Azione lenitiva, calmante, addolcente e rinfrescante</li>
            <li><strong>MOLECOLA ANTI-ODORE:</strong> Neutralizza istantaneamente qualsiasi odore</li>
            <li><strong>MOLECOLA EMOLLIENTE:</strong> Ammorbidisce e leviga la pelle</li>
            <li><strong>PROFUMO:</strong> Menta fresca</li>
          </ul>

          <p>
            <strong>Modalità d’uso:</strong> 2 spruzzi sulle dita e 2 su metatarso e tallone… 
          </p>

          <ul>
            <li>Utilizzabile su piedi e mani</li>
            <li>Formato da 100ml</li>
            <li>Prodotto Made in Italy 🇮🇹</li>
            <li>Cruelty Free 🐰</li>
            <li>Vegan 🍃</li>
            <li>76% di ingredienti di origine naturale 🌿</li>
          </ul>

          <div style={{ marginTop: '2rem', fontSize: '1.3rem', lineHeight: '1.6' }}>
            <p><strong>💰 Prezzo:</strong> € 17,90</p>
            <p>🔹 <strong>-10%</strong> sul primo acquisto → <strong>€ 16</strong></p>
            <p>🔹 <strong>-15%</strong> FISSO per le P. IVA → <strong>€ 15 IVA incl.</strong></p>
          </div>
        </div>
      </div>

      <Link to="/home" className="cta-button" style={{ display: 'inline-block', marginTop: '2rem' }}>
        ← Torna alla Home
      </Link>
    </main>
  );
}

export default Spray;
