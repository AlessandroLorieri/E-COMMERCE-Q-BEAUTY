
require("dotenv").config();

function failEnv(message) {
    console.error(`❌ Config env non valida: ${message}`);
    process.exit(1);
}

function parseAllowedOrigins(raw) {
    return String(raw || "")
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);
}

function validateEnv() {
    const env = process.env;

    const requiredVars = [
        "MONGO_URI",
        "JWT_SECRET",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CLIENT_ORIGIN",
        "PUBLIC_SITE_URL",
    ];

    const missingVars = requiredVars.filter((key) => !String(env[key] || "").trim());

    if (missingVars.length) {
        failEnv(`variabili mancanti: ${missingVars.join(", ")}`);
    }

    const mongoUri = String(env.MONGO_URI || "").trim();
    if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
        failEnv("MONGO_URI deve iniziare con mongodb:// oppure mongodb+srv://");
    }

    const jwtSecret = String(env.JWT_SECRET || "");
    if (env.NODE_ENV === "production" && jwtSecret.length < 32) {
        failEnv("JWT_SECRET troppo corto (min 32 caratteri in produzione)");
    }

    const stripeSecretKey = String(env.STRIPE_SECRET_KEY || "").trim();
    if (!/^sk_(test|live)_/.test(stripeSecretKey)) {
        failEnv("STRIPE_SECRET_KEY non sembra valida (atteso prefisso sk_test_ o sk_live_)");
    }

    const stripeWebhookSecret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (!/^whsec_/.test(stripeWebhookSecret)) {
        failEnv("STRIPE_WEBHOOK_SECRET non sembra valida (atteso prefisso whsec_)");
    }

    const allowedOrigins = parseAllowedOrigins(env.CLIENT_ORIGIN);

    if (!allowedOrigins.length) {
        failEnv("CLIENT_ORIGIN deve contenere almeno un origin valido");
    }

    for (const origin of allowedOrigins) {
        if (origin === "*") {
            failEnv("CLIENT_ORIGIN non può contenere '*'");
        }

        let url;
        try {
            url = new URL(origin);
        } catch {
            failEnv(`CLIENT_ORIGIN contiene un origin non valido: ${origin}`);
        }

        if (!/^https?:$/.test(url.protocol)) {
            failEnv(`CLIENT_ORIGIN contiene un protocollo non valido: ${origin}`);
        }

        if (url.pathname !== "/" || url.search || url.hash) {
            failEnv(`CLIENT_ORIGIN deve contenere solo origin senza path/query/hash: ${origin}`);
        }

        if (env.NODE_ENV === "production" && url.protocol !== "https:") {
            failEnv(`In produzione CLIENT_ORIGIN deve usare https: ${origin}`);
        }
    }

    const publicSiteUrlRaw = String(env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
    let publicSiteUrl;

    try {
        publicSiteUrl = new URL(publicSiteUrlRaw);
    } catch {
        failEnv("PUBLIC_SITE_URL non è un URL valido");
    }

    if (!/^https?:$/.test(publicSiteUrl.protocol)) {
        failEnv("PUBLIC_SITE_URL deve usare http o https");
    }

    if (env.NODE_ENV === "production" && publicSiteUrl.protocol !== "https:") {
        failEnv("In produzione PUBLIC_SITE_URL deve usare https");
    }

    if (publicSiteUrl.pathname !== "/" || publicSiteUrl.search || publicSiteUrl.hash) {
        failEnv("PUBLIC_SITE_URL deve contenere solo origin senza path/query/hash");
    }
}

validateEnv();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const authRoutes = require("./authorization/authorization.routes");
const orderRoutes = require("./orders/orders.routes");
const productRoutes = require("./products/products.routes");
const addressesRoutes = require("./addresses/addresses.routes");
const couponRoutes = require("./coupons/coupons.routes");
const reviewRoutes = require("./reviews/reviews.routes");
const shippingRoutes = require("./shipping/shipping.routes");

const makeStripeWebhookRouter = require("./webhooks/stripe.routes");
const makePaymentsRouter = require("./payments/payments.routes");
const makeDevRouter = require("./dev/dev.routes");

const { verifySmtp, sendWelcomeEmail } = require("./utils/mailer");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: false,
    })
);


app.use("/api/webhooks", makeStripeWebhookRouter({ stripe }));

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.originalUrl?.startsWith("/api/webhooks"),
    })
);

// Rate limit più stretto su auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Body parsers con limite (anti payload giganti)
const JSON_LIMIT = process.env.JSON_LIMIT || "200kb";
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

app.use(cookieParser());

function sanitizeValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeValue);

    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            // blocca operatori Mongo e path injection
            if (k.startsWith("$")) continue;
            if (k.includes(".")) continue;

            out[k] = sanitizeValue(v);
        }
        return out;
    }

    return value;
}

app.use((req, res, next) => {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);
    next();
});

// --- CORS allowlist
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGIN);

const corsOptions = {
    origin: (origin, cb) => {
        // origin assente = curl/server-to-server
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Preflight esplicito
app.options(/.*/, cors(corsOptions));


app.get("/health", (req, res) => {
    res.json({ ok: true });
});

// DEV ROUTES: SOLO fuori produzione
if (process.env.NODE_ENV !== "production") {
    app.use("/api/dev", makeDevRouter({ verifySmtp, sendWelcomeEmail }));
}

// Payments
app.use("/api/payments", makePaymentsRouter({ stripe }));

// Auth: limiter mirati (prima del router)
app.use("/api/auth", authLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/forgot-password", resetLimiter);
app.use("/api/auth/reset-password", resetLimiter);
app.use("/api/auth", authRoutes);

// API
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/shipping", shippingRoutes);

// 404 JSON
app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

// Error handler finale (JSON pulito)
app.use((err, req, res, next) => {
    if (err && err.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "CORS: origin non consentita" });
    }

    const status = Number(err?.status) || 500;

    const payload =
        process.env.NODE_ENV === "production"
            ? { message: err?.message || "Errore server" }
            : { message: err?.message || "Errore server", stack: err?.stack };

    return res.status(status).json(payload);
});

// --- DB + start server con graceful shutdown
let server;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connesso");
        const PORT = process.env.PORT || 4000;

        server = app.listen(PORT, () =>
            console.log(`✅ Backend attivo su http://localhost:${PORT}`)
        );
    })
    .catch((err) => {
        console.error("❌ Errore connessione Mongo:", err);
        process.exit(1);
    });

function shutdown(signal) {
    console.log(`\n🛑 Shutdown (${signal})...`);
    try {
        if (server) {
            server.close(() => {
                mongoose
                    .connection
                    .close(false)
                    .then(() => {
                        console.log("✅ Chiusura pulita completata");
                        process.exit(0);
                    })
                    .catch(() => process.exit(1));
            });

            // safety exit se qualcosa resta appeso
            setTimeout(() => process.exit(1), 10_000).unref();
        } else {
            process.exit(0);
        }
    } catch {
        process.exit(1);
    }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
