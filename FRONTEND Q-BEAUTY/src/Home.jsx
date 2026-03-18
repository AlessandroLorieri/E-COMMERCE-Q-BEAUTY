import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaEnvelope, FaRegCopy, FaShoppingCart, FaTiktok, FaCheck } from 'react-icons/fa';
import Seo from './components/Seo';
import './App.css';
import './Home.css';

const heroImage = '/HomeHero-logo1.png';

const founderImage = '/img/founder3.jpg';

function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText('assistenza@qbeautyshop.it');
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1800);
    } catch (err) {
      console.error('Errore copia email:', err);
    }
  }

  return (
    <>
      <Seo
        title="Q•BEAUTY | Pedicure professionale e cura del piede"
        description="Q•BEAUTY è una linea professionale per pedicure: prodotti di alta qualità, identità forte e shop online dedicato alla cura del piede."
        canonical="/"
        image="/img/last.jpg"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Q•BEAUTY",
          url: "https://qbeautyshop.it/",
          logo: "https://qbeautyshop.it/qbeautyvettoriale.png",
          email: "assistenza@qbeautyshop.it",
          sameAs: [
            "https://www.instagram.com/q.beauty_pedicurexperience",
            "https://www.instagram.com/queenhelene_nails",
            "https://www.tiktok.com/@q.beauty_pedicure"
          ]
        }}
      />

      <div className="home">
        <header className="homepage-hero" role="banner">
          <div className="homepage-hero__container">
            <img
              src={heroImage}
              alt="Q.BEAUTY"
              className="homepage-hero__img"
            />
          </div>
        </header>

        <main className="App home-page">
          <h1 className="visually-hidden">
            Q•BEAUTY, linea professionale per pedicure e cura del piede
          </h1>

          <section className={`shop-cta home-reveal ${loaded ? 'visible' : ''}`}>
            <div className="shop-cta-box">
              <p className="shop-cta-text">ACQUISTA I PRODOTTI Q･BEAUTY</p>

              <Link to="/shop" className="shop-cta-btn">
                Vai allo shop
                <FaShoppingCart style={{ marginLeft: '8px', fontSize: '1rem' }} />
              </Link>
            </div>
          </section>

          <section className={`founder founder--after-hero ${loaded ? 'visible' : ''}`}>
            <div className="founder-layout">
              <div className="founder-photo-container">
                <img
                  src={founderImage}
                  alt="La fondatrice"
                  className="founder-photo"
                />
              </div>



              <div className="founder-info">
                <h2 className="founder-title">LA FONDATRICE</h2>
                <div className="founder-text">

                  <p>
                    Sono{' '}
                    <a
                      href="https://www.instagram.com/queenhelene_nails/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#debe68',
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                      }}
                    >
                      Elena Santucci
                    </a>
                    , onicotecnica ed estetista dal 2013, Nail Educator dal 2020 con
                    più di mille corsiste formate insieme alla NAE Academy.
                    Nonostante le mani siano la mia più grande passione, tutto ciò
                    che riguarda la cura del piede è da sempre stato parte fondamentale
                    della mia carriera. Per questo motivo dopo anni di lavoro sul campo
                    e mesi di ricerche nasce Q.Beauty, una linea dedicata alla pedicure
                    professionale qualitativamente alta ed esteticamente d’impatto,
                    per portare il trattamento Pedicure ad un altro livello.
                  </p>
                </div>
              </div>
            </div>
          </section>


          <section className={`founder founder--products ${loaded ? 'visible' : ''}`} id="prodotti">
            <div className="founder-products-layout">
              <h2 className="founder-title">I PRODOTTI</h2>

              <div className="founder-photo-container">
                <img
                  src="/Home-Prodotti.png"
                  alt="Prodotti Q.BEAUTY"
                  className="founder-photo"
                />
              </div>

              <div className="founder-text">
                <p>
                  La linea Q•BEAUTY nasce dall'esigenza di una professionista: prodotti con formule
                  uniche e non replicabili, ingredienti di altissima qualità uniti ad un packaging
                  elegante ed iconico.
                  Perchè il trattamento di pedicure deve essere un rituale non solo estetico, ma
                  soprattutto mirato al benessere del piede.
                </p>
              </div>
            </div>
          </section>



          <section className={`contact home-reveal ${loaded ? 'visible' : ''}`}>
            <div className="contact-grid">
              <div className="contact-column">
                <h2>CONTATTI</h2>
                <p>
                  Per informazioni o richieste puoi contattarci via email.
                </p>

                <div className="contact-link-row">
                  <a
                    href="mailto: assistenza@qbeautyshop.it"
                    className="contact-link"
                  >
                    <FaEnvelope style={{ marginRight: '8px', fontSize: '1rem' }} />
                    assistenza@qbeautyshop.it
                  </a>

                  <button
                    type="button"
                    className={`contact-copy-btn ${emailCopied ? 'is-copied' : ''}`}
                    onClick={handleCopyEmail}
                    aria-label={emailCopied ? 'Email copiata' : 'Copia indirizzo email'}
                    title={emailCopied ? 'Email copiata' : 'Copia indirizzo email'}
                  >
                    {emailCopied ? (
                      <>
                        <FaCheck aria-hidden="true" className="contact-copy-btn__icon contact-copy-btn__icon--copied" />
                        <span className="contact-copy-btn__text">Copiata</span>
                      </>
                    ) : (
                      <FaRegCopy aria-hidden="true" className="contact-copy-btn__icon" />
                    )}
                  </button>
                </div>
              </div>

              <div className="contact-column">
                <h2>SOCIAL</h2>
                <p>
                  Per rimanere aggiornati sulle novità in tempo reale, seguici sui nostri canali social.
                </p>

                <div className="social-links">
                  <a
                    href="https://www.instagram.com/q.beauty_pedicurexperience"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="insta-btn"
                  >
                    <FaInstagram style={{ marginRight: '8px', fontSize: '1.35rem' }} />
                    @q.beauty_pedicurexperience
                  </a>

                  <a
                    href="https://www.instagram.com/queenhelene_nails"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="insta-btn"
                  >
                    <FaInstagram style={{ marginRight: '8px', fontSize: '1.35rem' }} />
                    @queenhelene_nails
                  </a>

                  <a
                    href="https://www.tiktok.com/@q.beauty_pedicure"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="insta-btn"
                  >
                    <FaTiktok style={{ marginRight: '8px', fontSize: '1.35rem' }} />
                    @q.beauty_pedicure
                  </a>
                </div>
              </div>
            </div>
          </section>

          <footer className="site-footer">
            <p>
              © {new Date().getFullYear()} Tutti i diritti riservati – Realizzato da{" "}
              <a
                href="https://sortedbros.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  verticalAlign: "middle",
                }}
              >
                <img
                  src="LOGO SORTED VETTORIALE.PNG"
                  alt="Sorted"
                  style={{
                    height: "25px",
                    width: "auto",
                    display: "block",
                    marginLeft: "5px"
                  }}
                />
              </a>
            </p>

            <p style={{ marginTop: 8, fontSize: '.95rem', opacity: 0.9 }}>
              <Link
                to="/privacy-policy"
                style={{ color: '#debe68', textDecoration: 'underline' }}
              >
                Privacy & Cookie
              </Link>
              {' · '}
              <button
                type="button"
                onClick={() => window.qbeautyCookie?.open?.()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#debe68',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
                aria-label="Apri impostazioni cookie"
              >
                Impostazioni cookie
              </button>
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

export default HomePage;