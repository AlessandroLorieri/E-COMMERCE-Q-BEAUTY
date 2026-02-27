const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
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
