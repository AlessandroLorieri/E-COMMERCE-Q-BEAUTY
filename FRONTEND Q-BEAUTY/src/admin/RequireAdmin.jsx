import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../shop/context/AuthContext";

export default function RequireAdmin({ children }) {
    const { loading, isAuthenticated, isAdmin } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ padding: 16 }}>Caricamento...</div>;
    }

    if (!isAuthenticated) {
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/shop/login?next=${next}`} replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/shop" replace />;
    }

    return children;
}
