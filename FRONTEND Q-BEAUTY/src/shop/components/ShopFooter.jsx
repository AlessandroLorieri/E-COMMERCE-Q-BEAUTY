import { Link } from "react-router-dom";
import "./ShopFooter.css";

export default function ShopFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="shop-footer">
            <div className="shop-footer-inner">
                <div className="shop-footer-left">
                    <div className="shop-footer-brand">Q•BEAUTY</div>
                    <div className="shop-footer-muted">Your pedicure experience</div>
                </div>

                <nav className="shop-footer-links" aria-label="Footer">
                    <Link to="/shop" className="shop-footer-link">Shop</Link>
                    <Link to="/shop/cart" className="shop-footer-link">Carrello</Link>
                    <Link to="/shop/orders" className="shop-footer-link">I miei ordini</Link>
                    <Link to="/home" className="shop-footer-link">Torna al sito</Link>
                </nav>

                <div className="shop-footer-right">
                    <div className="shop-footer-muted">
                        © {year} Q•BEAUTY
                    </div>
                </div>
            </div>
        </footer>
    );
}
