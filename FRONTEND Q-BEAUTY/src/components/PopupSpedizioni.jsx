import { useEffect, useState } from "react";
import "./PopupSpedizioni.css";

export default function PopupSpedizioni() {
    const [open, setOpen] = useState(true);

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === "Escape") {
                setOpen(false);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    if (!open) return null;

    return (
        <div
            className="popup-spedizioni__overlay"
            onClick={() => setOpen(false)}
            aria-hidden="true"
        >
            <div
                className="popup-spedizioni"
                role="dialog"
                aria-modal="true"
                aria-label="Avviso spedizioni"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="popup-spedizioni__close"
                    onClick={() => setOpen(false)}
                    aria-label="Chiudi popup"
                >
                    ×
                </button>

                <div className="popup-spedizioni__eyebrow">AVVISO SPEDIZIONI</div>

                <div className="popup-spedizioni__titleWrap">
                    <span className="diamond_small" aria-hidden="true" />
                    <h2 className="popup-spedizioni__title">
                        TUTTI GLI ORDINI EFFETTUATI DAL 25/03 AL 29/03 VERRANNO SPEDITI IL 30/03
                    </h2>
                    <span className="diamond_small" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}