import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CookieBanner.css";

const KEY = "q_consent"; // memorizzato in sessionStorage

export default function CookieBanner() {
  // mostra se NON esiste consenso nella sessione corrente
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(KEY));

  // opzionale: ?showcookie per forzare comparsa in dev
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("showcookie");
    if (force) {
      sessionStorage.removeItem(KEY);
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    sessionStorage.setItem(KEY, "accepted");
    setVisible(false);
  };
  const reject = () => {
    sessionStorage.setItem(KEY, "rejected");
    setVisible(false);
  };

  return (
    <div className="cookie-bar" role="dialog" aria-live="polite" aria-label="Informativa sui cookie">
      <div className="cookie-card" role="document">
        <p className="cookie-text" style={{ marginBottom: 6 }}>
          Usiamo <strong>cookie tecnici</strong> e, solo con il tuo consenso,
          <strong> cookie di misurazione anonimi</strong> per migliorare il sito.
          <strong> Nessuna profilazione.</strong>{" "}
          <Link to="/privacy-policy#cookie" className="cookie-link">Privacy Policy</Link>.
        </p>
        <p className="cookie-text" style={{ fontSize: ".9rem", opacity: 0.9, margin: 0 }}>
          Puoi rifiutare: il sito funziona comunque.
        </p>

        <div className="cookie-actions">
          <button className="btn btn-ghost" onClick={reject}>Rifiuta</button>
          <button className="btn btn-primary" onClick={accept}>Accetta tutti</button>
        </div>
      </div>
    </div>
  );
}
