import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CookieBanner.css";

const COOKIE_NAME = "q_consent";
const CONSENT_VERSION = 1;
const MAX_AGE_DAYS = 180; // ~6 mesi

function getCookie(name) {
  const all = document.cookie ? document.cookie.split("; ") : [];
  for (const part of all) {
    const idx = part.indexOf("=");
    const k = idx >= 0 ? part.slice(0, idx) : part;
    if (k === name) return idx >= 0 ? part.slice(idx + 1) : "";
  }
  return "";
}

function setCookie(name, value, days) {
  const maxAge = Math.max(0, Math.floor(days * 24 * 60 * 60));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name) {
  // Max-Age=0 cancella
  setCookie(name, "", 0);
}

function readConsent() {
  try {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;

    const json = decodeURIComponent(raw);
    const data = JSON.parse(json);

    if (!data || typeof data !== "object") return null;
    if (Number(data.v) !== CONSENT_VERSION) return null;

    const choice = String(data.choice || "");
    if (choice !== "accepted" && choice !== "rejected") return null;

    return data;
  } catch {
    return null;
  }
}

function writeConsent(choice) {
  const payload = { v: CONSENT_VERSION, choice, ts: Date.now() };
  const value = encodeURIComponent(JSON.stringify(payload));

  // cookie tecnico: serve solo a ricordare la scelta (durata 6 mesi)
  setCookie(COOKIE_NAME, value, MAX_AGE_DAYS);

  // evento utile per attivare/disattivare eventuali analytics solo dopo consenso
  window.dispatchEvent(new CustomEvent("qbeauty:consent", { detail: payload }));

  return payload;
}

export default function CookieBanner() {
  const initial = useMemo(() => readConsent(), []);
  const [visible, setVisible] = useState(() => !initial);

  useEffect(() => {
    // Dev helper: ?showcookie forza comparsa (e reset cookie)
    const force = new URLSearchParams(window.location.search).has("showcookie");
    if (force) {
      deleteCookie(COOKIE_NAME);
      setVisible(true);
      return;
    }

    // Se non c’è consenso valido, mostra banner
    if (!readConsent()) setVisible(true);
  }, []);

  // Espone metodi per aprire il banner da un link in footer (professionalità vera)
  useEffect(() => {
    window.qbeautyCookie = window.qbeautyCookie || {};
    window.qbeautyCookie.open = () => setVisible(true);
    window.qbeautyCookie.reset = () => {
      deleteCookie(COOKIE_NAME);
      setVisible(true);
    };
    window.qbeautyCookie.get = () => readConsent();

    return () => {
      // non distruggiamo l’oggetto se altre parti lo usano, ma puliamo le funzioni
      if (window.qbeautyCookie) {
        delete window.qbeautyCookie.open;
        delete window.qbeautyCookie.reset;
        delete window.qbeautyCookie.get;
      }
    };
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeConsent("accepted");
    setVisible(false);
  };

  const reject = () => {
    writeConsent("rejected");
    setVisible(false);
  };

  return (
    <div
      className="cookie-bar"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Informativa sui cookie"
    >
      <div className="cookie-card" role="document">
        <p className="cookie-text" style={{ marginBottom: 6 }}>
          Usiamo <strong>cookie tecnici</strong> necessari al funzionamento del sito.
          <strong> Nessuna profilazione.</strong>{" "}
          <Link to="/privacy-policy#cookie" className="cookie-link">
            Privacy & Cookie
          </Link>
          .
        </p>

        <p className="cookie-text" style={{ fontSize: ".9rem", opacity: 0.9, margin: 0 }}>
          Puoi riaprire questa informativa da “Impostazioni cookie” nel footer.
        </p>

        <div className="cookie-actions">
          <button className="btn btn-ghost" onClick={reject}>
            Rifiuta
          </button>
          <button className="btn btn-primary" onClick={accept}>
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
