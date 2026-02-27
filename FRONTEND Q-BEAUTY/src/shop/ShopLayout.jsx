import { Outlet } from "react-router-dom";
import ShopNavbar from "./components/ShopNavbar";
import ShopFooter from "./components/ShopFooter";

export default function ShopLayout() {
    return (
        <div className="shop-shell">
            <ShopNavbar />
            <main className="shop-main">
                <Outlet />
            </main>
            <ShopFooter />
        </div>
    );
}
