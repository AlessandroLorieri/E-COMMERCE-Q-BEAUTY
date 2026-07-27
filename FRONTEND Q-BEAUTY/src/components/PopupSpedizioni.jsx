import { useEffect, useState } from "react";
import "./PopupSpedizioni.css";

export default function PopupSpedizioni() {
    const [open, setOpen] = useState(true);

    // false = nasconde il blocco restock | true = mostra il blocco restock
    const SHOW_RESTOCK = true;

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
                aria-label={
                    SHOW_RESTOCK
                        ? "Avviso spedizioni e nuovo restock"
                        : "Avviso spedizioni"
                }
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

                <div className="popup-spedizioni__eyebrow">AVVISO SPEDIZIONI E NUOVO RESTOCK</div>

                <div className="popup-spedizioni__titleWrap">
                    <span className="diamond_small" aria-hidden="true" />

                    <h2 className="popup-spedizioni__title">
                        TUTTI GLI ORDINI EFFETTUATI DAL 27/07 AL 09/08 VERRANNO SPEDITI IL 10/08
                    </h2>

                    <span className="diamond_small" aria-hidden="true" />
                </div>

                {SHOW_RESTOCK ? (
                    <div className="popup-spedizioni__restock">
                        <div className="popup-spedizioni__restockLabel">
                            NUOVO RESTOCK
                        </div>

                        <div className="popup-spedizioni__restockDate">
                            IL 06/08
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}