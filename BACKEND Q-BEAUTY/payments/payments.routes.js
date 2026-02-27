const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const { sendBankTransferInstructionsEmail } = require("../utils/mailer");

module.exports = function makePaymentsRouter({ stripe }) {
    const router = express.Router();

    function requireAuth(req, res, next) {
        const auth = req.headers.authorization || "";
        const token =
            (auth.startsWith("Bearer ") ? auth.slice(7) : null) || req.cookies?.token;

        if (!token) return res.status(401).json({ message: "Non autenticato" });
        if (!process.env.JWT_SECRET)
            return res.status(500).json({ message: "JWT_SECRET mancante" });

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);

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

            next();
        } catch {
            return res.status(401).json({ message: "Token non valido" });
        }
    }

    function toObjectId(id) {
        try {
            return new mongoose.Types.ObjectId(id);
        } catch {
            return null;
        }
    }

    async function getOrderOr404(orderId) {
        const _id = toObjectId(orderId);
        if (!_id) return { error: { status: 400, message: "orderId non valido" } };

        const ordersCol = mongoose.connection.collection("orders");
        const order = await ordersCol.findOne({ _id });

        if (!order) return { error: { status: 404, message: "Ordine non trovato" } };

        return { _id, ordersCol, order };
    }

    function ensureOwnershipOr403({ reqUser, order }) {
        const uid = reqUser?._uid;
        const userEmail = reqUser?._email;
        const isAdmin = reqUser?.role === "admin" || reqUser?.isAdmin === true;

        const orderUserId = order?.user || order?.userId;
        const orderEmail = order?.email || order?.shippingAddress?.email || null;

        const matchesUserId =
            uid && orderUserId && String(orderUserId) === String(uid);

        const matchesEmail =
            userEmail &&
            orderEmail &&
            String(orderEmail).toLowerCase() === String(userEmail).toLowerCase();

        if (!isAdmin && !matchesUserId && !matchesEmail) {
            return { status: 403, message: "Non autorizzato su questo ordine" };
        }

        return null;
    }

    router.post("/bank-transfer/send-instructions", requireAuth, async (req, res) => {
        try {
            const { orderId, force } = req.body || {};
            if (!orderId) return res.status(400).json({ message: "orderId mancante" });

            const got = await getOrderOr404(orderId);
            if (got.error) return res.status(got.error.status).json({ message: got.error.message });

            const { _id, ordersCol, order } = got;

            const ownershipErr = ensureOwnershipOr403({ reqUser: req.user, order });
            if (ownershipErr) return res.status(ownershipErr.status).json({ message: ownershipErr.message });

            if (order.status === "paid") {
                return res.json({ ok: true, alreadyPaid: true, publicId: order.publicId });
            }

            if (order.bankEmailSentAt && !force) {
                return res.json({ ok: true, alreadySent: true, publicId: order.publicId });
            }

            if (!["pending_payment", "draft"].includes(order.status)) {
                return res.status(400).json({
                    message: `Ordine in stato "${order.status}", non compatibile col bonifico`,
                });
            }

            const beneficiary = process.env.BANK_BENEFICIARY || "Q•BEAUTY";
            const iban = process.env.BANK_IBAN || "";
            const deadlineHours = Number(process.env.BANK_DEADLINE_HOURS || 48);

            if (!iban) return res.status(500).json({ message: "BANK_IBAN mancante in .env" });

            const usersCol = mongoose.connection.collection("users");
            const orderUserId = order?.user || order?.userId;

            let to = order?.shippingAddress?.email || req.user?._email || null;

            if (!to && orderUserId) {
                const u = await usersCol.findOne(
                    { _id: new mongoose.Types.ObjectId(String(orderUserId)) },
                    { projection: { email: 1 } }
                );
                to = u?.email || null;
            }

            if (!to) return res.status(500).json({ message: "Email destinatario mancante" });

            const publicId = order.publicId || `#${String(orderId).slice(-6)}`;
            const name = order?.shippingAddress?.name || "";

            await sendBankTransferInstructionsEmail({
                to,
                order,
                name,
                publicId,
                beneficiary,
                iban,
                deadlineHours,
            });

            const update = order.bankEmailSentAt
                ? {
                    $set: {
                        bankEmailLastSentAt: new Date(),
                        paymentProvider: "bank_transfer",
                        updatedAt: new Date(),
                    },
                    $inc: { bankEmailSendCount: 1 },
                }
                : {
                    $set: {
                        bankEmailSentAt: new Date(),
                        paymentProvider: "bank_transfer",
                        updatedAt: new Date(),
                    },
                };

            await ordersCol.updateOne({ _id }, update);

            return res.json({
                ok: true,
                sent: true,
                publicId,
                resent: !!order.bankEmailSentAt,
            });
        } catch (err) {
            console.error("❌ Bonifico: errore invio istruzioni:", err);
            return res.status(500).json({ message: "Errore invio istruzioni bonifico" });
        }
    });

    router.post("/stripe/checkout-session", requireAuth, async (req, res) => {
        try {
            if (!stripe) {
                return res.status(500).json({ message: "Stripe non inizializzato (server.js)" });
            }
            if (!process.env.STRIPE_SECRET_KEY) {
                return res.status(500).json({ message: "STRIPE_SECRET_KEY mancante" });
            }

            const { orderId } = req.body || {};
            if (!orderId) return res.status(400).json({ message: "orderId mancante" });

            const got = await getOrderOr404(orderId);
            if (got.error) return res.status(got.error.status).json({ message: got.error.message });

            const { _id, ordersCol, order } = got;

            const ownershipErr = ensureOwnershipOr403({ reqUser: req.user, order });
            if (ownershipErr) return res.status(ownershipErr.status).json({ message: ownershipErr.message });

            if (!["pending_payment", "draft"].includes(order.status)) {
                return res.status(400).json({
                    message: `Ordine in stato "${order.status}", non pagabile`,
                });
            }

            const totalCents =
                order.totalCents ??
                order.totalAmountCents ??
                (Number(order.subtotalCents || 0) -
                    Number(order.discountCents || 0) +
                    Number(order.shippingCents || 0));

            if (!Number.isInteger(totalCents) || totalCents <= 0) {
                return res.status(400).json({ message: "Totale ordine non valido" });
            }

            const frontend = (() => {
                const raw =
                    process.env.FRONTEND_URL ||
                    (process.env.CLIENT_ORIGIN ? String(process.env.CLIENT_ORIGIN).split(",")[0] : "") ||
                    "http://localhost:5173";

                return String(raw).trim().replace(/\/+$/, "");
            })();

            const orderIdEnc = encodeURIComponent(String(orderId));

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "eur",
                            product_data: {
                                name: `Ordine Q-Beauty #${String(orderId).slice(-6)}`,
                            },
                            unit_amount: totalCents,
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${frontend}/shop/order-success/${orderIdEnc}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontend}/shop/checkout?canceled=1&orderId=${orderIdEnc}`,
                metadata: {
                    orderId: String(orderId),
                    userId: req.user?._uid ? String(req.user._uid) : "",
                },
                customer_email: req.user?._email || undefined,
                locale: "it",
            });

            await ordersCol.updateOne(
                { _id },
                {
                    $set: {
                        stripeCheckoutSessionId: session.id,
                        stripeCheckoutCreatedAt: new Date(),
                        updatedAt: new Date(),
                    },
                }
            );

            return res.json({ url: session.url });
        } catch (err) {
            console.error("❌ Errore creazione checkout session:", err);
            return res.status(500).json({ message: "Errore creazione checkout session" });
        }
    });

    return router;
};
