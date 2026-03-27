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

    async function authFetch(path, options = {}) {
        const url = path.startsWith("http") ? path : `${apiBase}${path}`;

        const headers = {
            ...(options.headers || {}),
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(url, { ...options, headers });

        if (res.status === 401 || res.status === 403) {
            logout();
            const err = new Error("SESSION_EXPIRED");
            err.code = "SESSION_EXPIRED";
            throw err;
        }

        return res;
    }

    async function fetchMe(activeToken = token) {
        if (!activeToken) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${apiBase}/api/auth/me`, {
                headers: { Authorization: `Bearer ${activeToken}` },
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }

            if (!res.ok) {
                // server down / 500 / ecc: non forziamo logout
                setUser(null);
                return;
            }

            const data = await res.json();
            setUser(data.user);
        } catch (err) {
            console.error("fetchMe error:", err);
            // errore rete: non facciamo logout automatico
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

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data?.message || "Register failed");
            err.payload = data;
            err.status = res.status;
            throw err;
        }

        saveToken(data.token);
        setUser(data.user);
        return data.user;
    }

    useEffect(() => {
        fetchMe(token);
    }, [token]);

    const value = useMemo(
        () => ({
            user,
            token,
            loading,
            login,
            register,
            logout,
            fetchMe,
            authFetch,
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
