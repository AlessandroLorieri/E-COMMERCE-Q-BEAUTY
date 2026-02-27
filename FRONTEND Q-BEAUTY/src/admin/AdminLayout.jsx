import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout() {
    return (
        <div className="admin">
            <aside className="admin__sidebar">
                <div className="admin__brand">Q-Beauty Admin</div>

                <nav className="admin__nav">
                    <NavLink to="/admin" end className="admin__link">
                        Dashboard
                    </NavLink>
                    <NavLink to="/admin/products" className="admin__link">
                        Prodotti
                    </NavLink>
                    <NavLink to="/admin/orders" className="admin__link">
                        Ordini
                    </NavLink>
                    <NavLink to="/admin/coupons" className="admin__link">
                        Coupons
                    </NavLink>

                    <div className="admin__divider" />

                    <NavLink to="/shop" className="admin__link">
                        Torna allo shop
                    </NavLink>
                </nav>
            </aside>

            <main className="admin__content">
                <Outlet />
            </main>
        </div>
    );
}
