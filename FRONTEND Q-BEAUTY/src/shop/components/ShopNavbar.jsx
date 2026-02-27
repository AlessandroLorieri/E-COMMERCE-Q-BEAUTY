import { Link } from "react-router-dom";
import { User, ShoppingCart } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";


import "./ShopNavbar.css";

export default function ShopNavbar({ }) {
    const { totals, user } = useShop();
    const { isAdmin } = useAuth();
    const cartCount = totals.items;
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="shop-header">
            <div className="shop-header-inner">
                <Link to="/shop" className="shop-brand" aria-label="QBeauty Shop">
                    <img
                        src="/img/qbeautyshop-logo.png"
                        alt="QBeauty"
                        className="shop-brand-logo"
                        loading="eager"
                    />
                    <span className="shop-brand-text">SHOP</span>
                </Link>
<div className="shop-header-actions">
                    {/* Carrello */}
                    <Link to="/shop/cart" className="shop-icon-btn" aria-label="Carrello">
                        <ShoppingCart className="shop-icon" />
                        {cartCount > 0 && <span className="shop-badge">{cartCount}</span>}
                    </Link>

                    {/* Utente */}
                    <Link to="/shop/login?next=/shop" className="shop-icon-btn" aria-label="Area utente">
                        <User className="shop-icon" />
                    </Link>

                    {/* Hamburger */}
                    <button
                        type="button"
                        className="shop-burger"
                        aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
                        aria-controls="shop-nav"
                        aria-expanded={menuOpen ? "true" : "false"}
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>

                <nav id="shop-nav" className={`shop-nav ${menuOpen ? "is-open" : ""}`}>
                    {user ? (
                        isAdmin ? (
                            <Link to="/admin" className="shop-nav-link" onClick={() => setMenuOpen(false)}>
                                Pannello di controllo
                            </Link>
                        ) : (
                            <Link to="/shop/orders" className="shop-nav-link" onClick={() => setMenuOpen(false)}>
                                I miei ordini
                            </Link>
                        )
                    ) : (
                        <span className="shop-nav-link shop-nav-link-disabled" title="Accedi per vedere i tuoi ordini">
                            I miei ordini
                        </span>
                    )}

                    <Link to="/home" className="shop-nav-link" onClick={() => setMenuOpen(false)}>
                        Torna al sito
                    </Link>
                </nav>

            </div>
        </header>
    );
}
