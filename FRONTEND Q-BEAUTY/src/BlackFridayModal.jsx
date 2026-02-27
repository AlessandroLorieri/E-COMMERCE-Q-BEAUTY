import React, { useEffect, useState } from "react";
import BlackFridayBanner from "./BlackFridayBanner";
import "./BlackFriday.css";

function BlackFridayModal({ open, onClose }) {
  const [showVideo, setShowVideo] = useState(true);

  // blocca lo scroll della pagina quando il popup è aperto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // gestione video: dopo 5 secondi mostra il banner
  useEffect(() => {
    if (!open) return;

    // quando il modal si apre, riparti sempre dal video
    setShowVideo(true);

    const timer = setTimeout(() => {
      setShowVideo(false);
    }, 5000); // 5000 ms = 5 secondi

    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="bf-modal-backdrop" onClick={onClose}>
      <div
        className="bf-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="bf-modal-close"
          onClick={onClose}
          aria-label="Chiudi promo Black Friday"
        >
          ×
        </button>

        {showVideo ? (
          <div className="bf-video-wrapper">
            <video
              src="/video/bf-intro.mp4"  // <-- cambia il nome se diverso
              autoPlay
              muted
              playsInline
              className="bf-video"
            />
          </div>
        ) : (
          <BlackFridayBanner />
        )}
      </div>
    </div>
  );
}

export default BlackFridayModal;
