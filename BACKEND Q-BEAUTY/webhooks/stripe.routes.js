const express = require("express");
const mongoose = require("mongoose");

const {
    sendOrderPaymentConfirmedEmail,
    sendAdminNewOrderEmail,
} = require("../utils/mailer");

function shortId(v, keep = 6) {
    const s = String(v || "");
    if (!s) return "-";
    return s.length <= keep ? s : `…${s.slice(-keep)}`;
}

function maskEmail(v) {
    const s = String(v || "").trim();
    if (!s || !s.includes("@")) return "-";
    const [u, d] = s.split("@");
    const u2 = u.length <= 2 ? `${u[0] || "*"}*` : `${u.slice(0, 2)}***`;
    return `${u2}@${d}`;
}

function maskStripeId(v) {
    const s = String(v || "").trim();
    if (!s) return "-";
    const prefix = s.includes("_") ? s.split("_").slice(0, 2).join("_") : s.slice(0, 3);
    return `${prefix}_…${s.slice(-4)}`;
}

function safeMetaKeys(obj) {
    try {
        return Object.keys(obj || {}).slice(0, 20);
    } catch {
        return [];
    }
}

const STRIPE_EVENTS_TTL_DAYS = 30;
const STRIPE_EVENTS_TTL_SECONDS = STRIPE_EVENTS_TTL_DAYS * 24 * 60 * 60;
const STRIPE_EVENTS_TTL_INDEX_NAME = "receivedAt_ttl_30d";

let stripeEventsIndexesReadyPromise = null;

async function ensureStripeEventsIndexes(eventsCol) {
    if (stripeEventsIndexesReadyPromise) {
        return stripeEventsIndexesReadyPromise;
    }

    stripeEventsIndexesReadyPromise = (async () => {
        let indexes = [];

        try {
            indexes = await eventsCol.indexes();
        } catch (err) {
            const msg = String(err?.message || err);

            if (!msg.includes("ns does not exist")) {
                throw err;
            }

            indexes = [];
        }

        const receivedAtIndex = indexes.find((idx) => {
            const key = idx?.key || {};
            return key.receivedAt === 1 && Object.keys(key).length === 1;
        });

        if (!receivedAtIndex) {
            await eventsCol.createIndex(
                { receivedAt: 1 },
                {
                    name: STRIPE_EVENTS_TTL_INDEX_NAME,
                    expireAfterSeconds: STRIPE_EVENTS_TTL_SECONDS,
                }
            );

            console.log("Stripe webhook: creato TTL index su stripe_events", {
                index: STRIPE_EVENTS_TTL_INDEX_NAME,
                days: STRIPE_EVENTS_TTL_DAYS,
            });
            return;
        }

        if (
            typeof receivedAtIndex.expireAfterSeconds === "number" &&
            receivedAtIndex.expireAfterSeconds === STRIPE_EVENTS_TTL_SECONDS
        ) {
            return;
        }

        console.warn("Stripe webhook: indice esistente su stripe_events.receivedAt non allineato al TTL atteso", {
            existingIndexName: receivedAtIndex.name,
            existingExpireAfterSeconds:
                typeof receivedAtIndex.expireAfterSeconds === "number"
                    ? receivedAtIndex.expireAfterSeconds
                    : null,
            expectedExpireAfterSeconds: STRIPE_EVENTS_TTL_SECONDS,
        });
    })().catch((err) => {
        stripeEventsIndexesReadyPromise = null;
        throw err;
    });

    return stripeEventsIndexesReadyPromise;
}

module.exports = function makeStripeWebhookRouter({ stripe }) {
    const router = express.Router();

    function withTimeout(promise, ms, label = "timeout") {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${label} after ${ms}ms`)), ms)
            ),
        ]);
    }

    router.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
        const sig = req.headers["stripe-signature"];
        if (!sig) return res.status(400).send("Missing stripe-signature header");

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return res.status(500).json({ message: "STRIPE_WEBHOOK_SECRET mancante" });
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log("✅ Stripe webhook ricevuto", {
            eventId: maskStripeId(event?.id),
            type: event?.type,
            livemode: event?.livemode,
        });

        try {
            const ordersCol = mongoose.connection.collection("orders");
            const eventsCol = mongoose.connection.collection("stripe_events");

            await ensureStripeEventsIndexes(eventsCol);

            const stripeEventId = String(event?.id || "");

            const existingEvent = await eventsCol.findOne(
                { _id: stripeEventId },
                { projection: { _id: 1 } }
            );

            if (existingEvent) {
                console.log("Stripe webhook: evento duplicato, skip", {
                    eventId: maskStripeId(event?.id),
                    type: event?.type,
                });
                return res.status(200).json({ received: true, duplicate: true });
            }
            const claimEmailLock = async ({ _id, sentAtField, lockField }) => {
                const now = new Date();
                const LOCK_TTL_MINUTES = 30;
                const staleBefore = new Date(now.getTime() - LOCK_TTL_MINUTES * 60 * 1000);

                const r = await ordersCol.updateOne(
                    {
                        _id,
                        [sentAtField]: { $exists: false },
                        $or: [
                            { [lockField]: { $exists: false } },
                            { [lockField]: { $lt: staleBefore } }, // lock vecchio → lo riprendo
                        ],
                    },
                    { $set: { [lockField]: now } }
                );

                return r?.modifiedCount === 1;
            };

            const markEmailSuccess = async ({ _id, sentAtField, lockField }) => {
                await ordersCol.updateOne(
                    { _id },
                    { $set: { [sentAtField]: new Date() }, $unset: { [lockField]: "" } }
                );
            };

            const clearEmailLock = async ({ _id, lockField }) => {
                await ordersCol.updateOne({ _id }, { $unset: { [lockField]: "" } });
            };

            const markCancelledByOrderId = async (orderId) => {
                if (!orderId) return;
                if (!mongoose.Types.ObjectId.isValid(String(orderId))) return;

                const _id = new mongoose.Types.ObjectId(String(orderId));
                const r = await ordersCol.updateOne(
                    { _id, status: { $in: ["pending_payment", "draft"] } },
                    { $set: { status: "cancelled", updatedAt: new Date() } }
                );

                console.log("Stripe webhook: ordine cancellato (se presente)", {
                    orderId: String(orderId),
                    matched: r?.matchedCount,
                    modified: r?.modifiedCount,
                });
            };

            switch (event.type) {
                case "checkout.session.completed":
                case "checkout.session.async_payment_succeeded": {
                    const session = event.data.object;
                    const orderId = session?.metadata?.orderId;

                    if (!orderId) {
                        console.warn("Stripe webhook: metadata.orderId mancante", {
                            eventId: maskStripeId(event?.id),
                            type: event?.type,
                            sessionId: maskStripeId(session?.id),
                            metadataKeys: safeMetaKeys(session?.metadata),
                        });
                        break;
                    }

                    if (
                        event.type === "checkout.session.completed" &&
                        session?.payment_status !== "paid" &&
                        session?.payment_status !== "no_payment_required"
                    ) {
                        console.log("Stripe webhook: completed ma payment_status non paid", {
                            sessionId: maskStripeId(session?.id),
                            payment_status: session?.payment_status,
                        });
                        break;
                    }

                    if (!mongoose.Types.ObjectId.isValid(String(orderId))) {
                        console.warn("Stripe webhook: orderId NON valido", {
                            eventId: maskStripeId(event?.id),
                            type: event?.type,
                            orderId: shortId(orderId),
                        });
                        break;
                    }

                    const _id = new mongoose.Types.ObjectId(String(orderId));

                    await ordersCol.updateOne(
                        { _id },
                        {
                            $set: {
                                paymentProvider: "stripe",
                                stripeCheckoutSessionId: session?.id || null,
                                stripePaymentIntentId: session?.payment_intent || null,
                                updatedAt: new Date(),
                            },
                        }
                    );

                    const updPaid = await ordersCol.updateOne(
                        { _id, status: { $in: ["pending_payment", "draft"] } },
                        { $set: { status: "paid", paidAt: new Date(), updatedAt: new Date() } }
                    );

                    console.log("Stripe webhook: update ordine (paid se possibile)", {
                        orderId: String(orderId),
                        paidMatched: updPaid?.matchedCount,
                        paidModified: updPaid?.modifiedCount,
                    });

                    const order = await ordersCol.findOne({ _id });
                    if (!order) {
                        console.warn("Stripe webhook: ordine non trovato", {
                            eventId: maskStripeId(event?.id),
                            orderId: String(orderId),
                        });
                        break;
                    }

                    if (!order.adminEmailSentAt) {
                        const adminLocked = await claimEmailLock({
                            _id,
                            sentAtField: "adminEmailSentAt",
                            lockField: "adminEmailSendingAt",
                        });

                        if (!adminLocked) {
                            console.log("Stripe webhook: admin email già in invio o inviata, skip", {
                                orderId: String(orderId),
                            });
                        } else {
                            const fallbackEmail =
                                order?.shippingAddress?.email ||
                                session?.customer_details?.email ||
                                session?.customer_email ||
                                null;

                            const name = [order?.shippingAddress?.name, order?.shippingAddress?.surname]
                                .filter(Boolean)
                                .join(" ")
                                .trim();

                            try {
                                await withTimeout(
                                    sendAdminNewOrderEmail({
                                        order,
                                        user: {
                                            _id: order.user,
                                            name,
                                            email: fallbackEmail,
                                        },
                                        paymentMethod: "stripe",
                                    }),
                                    15000,
                                    "sendAdminNewOrderEmail"
                                );

                                await markEmailSuccess({
                                    _id,
                                    sentAtField: "adminEmailSentAt",
                                    lockField: "adminEmailSendingAt",
                                });

                                console.log("Stripe webhook: email admin nuovo ordine inviata", {
                                    orderId: String(orderId),
                                });
                            } catch (e) {
                                await clearEmailLock({ _id, lockField: "adminEmailSendingAt" });
                                console.error("Email admin nuovo ordine fallita:", e?.message || e);
                            }
                        }
                    }

                    if (order.paymentEmailSentAt) {
                        console.log("Stripe webhook: payment email già inviata, skip", {
                            orderId: String(orderId),
                        });
                        break;
                    }

                    const to =
                        order?.shippingAddress?.email ||
                        session?.customer_details?.email ||
                        session?.customer_email ||
                        null;

                    if (!to) {
                        console.warn("Stripe webhook: destinatario email mancante", {
                            orderId: shortId(orderId),
                            publicId: order?.publicId || "-",
                            shipEmail: maskEmail(order?.shippingAddress?.email),
                            stripeEmail: maskEmail(session?.customer_details?.email || session?.customer_email),
                            sessionId: maskStripeId(session?.id),
                        });
                        break;
                    }

                    const payLocked = await claimEmailLock({
                        _id,
                        sentAtField: "paymentEmailSentAt",
                        lockField: "paymentEmailSendingAt",
                    });

                    if (!payLocked) {
                        console.log("Stripe webhook: payment email già in invio o inviata, skip", {
                            orderId: String(orderId),
                        });
                        break;
                    }

                    try {
                        await withTimeout(
                            sendOrderPaymentConfirmedEmail({ to, order, includeItems: true }),
                            15000,
                            "sendOrderPaymentConfirmedEmail"
                        );

                        await markEmailSuccess({
                            _id,
                            sentAtField: "paymentEmailSentAt",
                            lockField: "paymentEmailSendingAt",
                        });

                        console.log("Stripe webhook: email pagamento inviata", {
                            orderId: shortId(orderId),
                            to: maskEmail(to),
                        });
                    } catch (mailErr) {
                        await clearEmailLock({ _id, lockField: "paymentEmailSendingAt" });

                        console.error("Stripe webhook: email pagamento FALLITA", {
                            orderId: shortId(orderId),
                            error: String(mailErr?.message || mailErr),
                        });
                    }
                    break;
                }
                case "checkout.session.expired": {
                    const session = event.data.object;
                    const orderId = session?.metadata?.orderId;
                    await markCancelledByOrderId(orderId);
                    break;
                }

                case "checkout.session.async_payment_failed": {
                    const session = event.data.object;
                    const orderId = session?.metadata?.orderId;
                    await markCancelledByOrderId(orderId);
                    break;
                }

                default:
                    console.log("Stripe webhook: evento ignorato", {
                        type: event?.type,
                        eventId: maskStripeId(event?.id),
                    });
                    break;
            }
            try {
                await eventsCol.insertOne({
                    _id: stripeEventId,
                    type: String(event?.type || ""),
                    livemode: Boolean(event?.livemode),
                    receivedAt: new Date(),
                    stripeCreatedAt: event?.created ? new Date(Number(event.created) * 1000) : null,
                    processedAt: new Date(),
                });
            } catch (e) {
                if (!(e && (e.code === 11000 || String(e.message || "").includes("E11000")))) {
                    throw e;
                }

                console.log("Stripe webhook: evento già registrato in chiusura", {
                    eventId: maskStripeId(event?.id),
                    type: event?.type,
                });
            }

            console.log("✅ Stripe webhook: processing completato", {
                eventId: maskStripeId(event?.id),
                type: event?.type,
            });

            return res.status(200).json({ received: true });
        } catch (err) {
            console.error("❌ Stripe webhook handler error:", {
                eventId: maskStripeId(event?.id),
                type: event?.type,
                message: err?.message || String(err),
                stack: err?.stack || null,
            });
            return res.status(500).json({ message: "Webhook processing failed" });
        }
    });

    return router;
};
