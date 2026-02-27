
import "./BrandSpinner.css";

export default function BrandSpinner({ size = 56, text = "Caricamento..." }) {
    return (
        <div className="qb-spinner-wrap">
            <img
                src="/qbeautyvettoriale.png"
                alt="Q-Beauty"
                className="qb-spinner-logo"
                style={{ width: size, height: size }}
            />
            {text ? <div className="qb-spinner-text">{text}</div> : null}
        </div>
    );
}
