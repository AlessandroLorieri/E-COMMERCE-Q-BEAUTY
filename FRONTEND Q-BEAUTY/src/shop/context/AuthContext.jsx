import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "qbeauty_token";

export function AuthProvider({ children }) {
    const apiBase = import.meta.env.VITE_API_URL;

    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function saveToken(newToken) {
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
    }

    function logout() {
        setUser(null);
        setToken("");
        localStorage.removeItem(TOKEN_KEY);
        setLoading(false);
    }

    async function fetchMe(activeToken = token) {
        if (!activeToken) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${apiBase}/api/auth/me`, {
                headers: { Authorization: `Bearer ${activeToken}` },
            });

            if (!res.ok) {
                logout();
                return;
            }

            const data = await res.json();
            setUser(data.user);
        } catch (err) {
            console.error("fetchMe error:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(email, password) {
        const res = await fetch(`${apiBase}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Login failed");

        saveToken(data.token);
        setUser(data.user);
        return data.user;
    }

    async function register(payload) {
        const res = await fetch(`${apiBase}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Register failed");

        saveToken(data.token);
        setUser(data.user);
        return data.user;
    }

    useEffect(() => {
        fetchMe(token);
    }, []);

    const value = useMemo(
        () => ({
            user,
            token,
            loading,
            login,
            register,
            logout,
            fetchMe,
            isAuthenticated: !!user,
            isAdmin: user?.role === "admin",
        }),
        [user, token, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
