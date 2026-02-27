// src/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram } from 'react-icons/fa';
import './App.css';
// import BecomeResellerSection from './components/BecomeResellerSection';

// ✅ immagini servite da /public/img (niente import)
const founderImage = '/img/founder3.jpg';
const sprayImage = '/img/spray1.jpg';
const burroImage = '/img/burro_emoliente.jpg';
const cremaImage = '/img/crema_piedi.jpg';
const setImage = '/img/beauty_set.png';
const qbeautyBg = '/img/qbeauty.jpg';

function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home">
      <main className="App">
        {/* Fondatrice */}
        <section className={`founder ${loaded ? 'visible' : ''}`}>
          <h2>La Fondatrice</h2>
          <div
            className="founder-photo-container"
            onClick={() => setModalOpen(true)}
          >
            <img
              src={founderImage}
              alt="La fondatrice"
              className="founder-photo"
            />
          </div>
        </section>

        {/* Modale descrizione fondatrice */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {/* ✅ usa l'immagine dal public/img */}
              <img src={qbeautyBg} alt="QBeauty sfondo" className="modal-background" />
              <div className="modal-text">
                <h3>Chi sono</h3>
                <p>
                  Sono{' '}
                  <a
                    href="https://www.instagram.com/queenhelene_nails/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ffcc00', fontWeight: 'bold', textDecoration: 'underline' }}
                  >
                    Elena Santucci
                  </a>
                  , onicotecnica ed estetista dal 2013, Nail Educator dal 2020 con più di mille corsiste formate insieme alla NAE Academy.
                  Nonostante le mani siano la mia più grande passione, tutto ciò che riguarda la cura del piede è da sempre stato parte fondamentale della mia carriera.
                  Per questo motivo dopo anni di lavoro sul campo e mesi di ricerche nasce Q.Beauty, una linea dedicata alla pedicure professionale qualitativamente alta ed esteticamente d’impatto, per portare il trattamento Pedicure ad un altro livello.
                </p>
                <button onClick={() => setModalOpen(false)}>Chiudi</button>
              </div>
            </div>
          </div>
        )}

        {/* Prodotti */}
        <section className={`gallery ${loaded ? 'visible' : ''}`} id="prodotti">
          <h2>Prodotti</h2>
          <div className="products">
            <Link to="/prodotti/Spray">
              <img src={sprayImage} alt="Spray Igienizzante" />
            </Link>
            <Link to="/prodotti/Olio">
              <img src={burroImage} alt="Burro Emolliente" />
            </Link>
            <Link to="/prodotti/Siero">
              <img src={cremaImage} alt="Crema Piedi" />
            </Link>
          </div>
        </section>


        {/* Link con route /shop */}
        <section className="shop-cta">
          <div className="shop-cta-box">
            <h2 className="shop-cta-title">Shop</h2>
            <p className="shop-cta-text">
              Acquista i prodotti Q•BEAUTY direttamente nello shop.
            </p>

            <Link to="/shop" className="shop-cta-btn">
              Entra nello Shop
            </Link>
          </div>
        </section>


        {/* Set */}
        <section className="set-section">
          <h2>Set</h2>
          <p>Scopri il nostro set esclusivo per un trattamento completo Q•BEAUTY.</p>
          <Link to="/set">
            <img src={setImage} alt="Set QBeauty" className="set-image" />
          </Link>
        </section>

        {/* Contatti Instagram */}
        <section className="contact">
          <h2>INSTAGRAM</h2>
          <p>Per rimanere aggiornato su tutte le novità e le ultime uscite, non dimenticarti di seguirci su Instagram</p>
          <a
            href="https://www.instagram.com/q.beauty_pedicurexperience/"
            target="_blank"
            rel="noopener noreferrer"
            className="insta-btn"
          >
            <FaInstagram style={{ marginRight: '8px' }} />
            Segui su Instagram
          </a>
        </section>

        {/* Form di contatto */}


        {/* Sezione rivenditori con animazione */}
        {/* <BecomeResellerSection loaded={loaded} /> */}

        {/* Footer */}
        <footer className="site-footer">
          <p>
            © {new Date().getFullYear()} Tutti i diritti riservati – Realizzato da{' '}
            <a
              href="https://sorted-beryl.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffcc00', fontWeight: 'bold', textDecoration: 'bold' }}
            >
              Sorted
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default HomePage;
