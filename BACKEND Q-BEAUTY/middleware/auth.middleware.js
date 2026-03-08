const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
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

        // ✅ blocca algoritmi strani: accetta solo HS256
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        // campi compatibilità (usati da payments.routes.js)
        const uid =
            payload?.id ||
            payload?._id ||
            payload?.userId ||
            payload?.sub ||
            payload?.uid;

        const email = payload?.email || payload?.mail;

        req.user = {
            ...payload,
            _uid: uid ? String(uid) : null,
            _email: email ? String(email) : null,
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
