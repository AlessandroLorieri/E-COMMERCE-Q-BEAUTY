const jwt = require("jsonwebtoken");
const User = require("../authorization/authorization.schema");

async function authRequired(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, bearerToken] = header.split(" ");

        // Supporto sia Bearer che cookie token (per compatibilità)
        const token =
            (type === "Bearer" && bearerToken ? bearerToken : null) ||
            req.cookies?.token ||
            null;

        if (!token) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: "JWT_SECRET mancante" });
        }

        // accetta solo HS256
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        const uid =
            payload?.id ||
            payload?._id ||
            payload?.userId ||
            payload?.sub ||
            payload?.uid;

        if (!uid) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const user = await User.findById(uid)
            .select("_id email role passwordChangedAt")
            .lean();

        if (!user) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const tokenIssuedAt = Number(payload?.iat || 0);
        const passwordChangedAtSec = user.passwordChangedAt
            ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
            : 0;

        // se la password è stata cambiata dopo l'emissione del token, il token non è più valido
        if (passwordChangedAtSec && (!tokenIssuedAt || passwordChangedAtSec > tokenIssuedAt)) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        req.user = {
            ...payload,
            sub: String(user._id),
            role: user.role,
            email: user.email,
            _uid: String(user._id),
            _email: String(user.email || ""),
        };

        return next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

function adminOnly(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
}

module.exports = {
    authRequired,
    adminOnly,
};