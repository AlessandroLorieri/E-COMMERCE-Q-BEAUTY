require("dotenv").config();

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

const makeStripeWebhookRouter = require("./webhooks/stripe.routes");
const makePaymentsRouter = require("./payments/payments.routes");
const makeDevRouter = require("./dev/dev.routes");

const { verifySmtp, sendWelcomeEmail } = require("./utils/mailer");

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use("/api/webhooks", makeStripeWebhookRouter({ stripe }));

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);

            if (allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.use("/api/dev", makeDevRouter({ verifySmtp, sendWelcomeEmail }));
app.use("/api/payments", makePaymentsRouter({ stripe }));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/coupons", couponRoutes);

app.use((err, req, res, next) => {
    if (err && err.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "CORS: origin non consentita" });
    }
    return next(err);
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connesso");
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () =>
            console.log(`✅ Backend attivo su http://localhost:${PORT}`)
        );
    })
    .catch((err) => {
        console.error("❌ Errore connessione Mongo:", err);
        process.exit(1);
    });
