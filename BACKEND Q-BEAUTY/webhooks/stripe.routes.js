const express = require("express");
const mongoose = require("mongoose");

const { sendOrderPaymentConfirmedEmail } = require("../utils/mailer");

module.exports = function makeStripeWebhookRouter({ stripe }) {
    const router = express.Router();

    router.post(
        "/stripe",
        express.raw({ type: "application/json" }),
        async (req, res) => {
            const sig = req.headers["stripe-signature"];
            if (!sig) {
                return res.status(400).send("Missing stripe-signature header");
            }

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
                eventId: event?.id,
                type: event?.type,
                livemode: event?.livemode,
            });

            // ✅ ACK IMMEDIATO: Stripe deve ricevere 2xx subito (evita timeout/risposta vuota/retry)
            res.status(200).json({ received: true });

            // Tutto il resto lo facciamo async, senza bloccare la risposta a Stripe
            setImmediate(async () => {
                try {
                    const ordersCol = mongoose.connection.collection("orders");

                    const markCancelledByOrderId = async (orderId) => {
                        if (!orderId) return;
                        if (!mongoose.Types.ObjectId.isValid(String(orderId))) return;

                        const _id = new mongoose.Types.ObjectId(String(orderId));

                        await ordersCol.updateOne(
                            { _id, status: { $in: ["pending_payment", "draft"] } },
                            { $set: { status: "cancelled", updatedAt: new Date() } }
                        );
                    };

                    switch (event.type) {
                        case "checkout.session.completed":
                        case "checkout.session.async_payment_succeeded": {
                            const session = event.data.object;
                            const orderId = session?.metadata?.orderId;

                            if (!orderId) {
                                console.warn("Stripe webhook: metadata.orderId mancante", {
                                    eventId: event?.id,
                                    type: event?.type,
                                    sessionId: session?.id,
                                    metadata: session?.metadata,
                                });
                                break;
                            }

                            if (
                                event.type === "checkout.session.completed" &&
                                session?.payment_status !== "paid" &&
                                session?.payment_status !== "no_payment_required"
                            ) {
                                console.log("Stripe webhook: session completed ma pagamento non ancora paid", {
                                    sessionId: session?.id,
                                    payment_status: session?.payment_status,
                                });
                                break;
                            }

                            if (!mongoose.Types.ObjectId.isValid(String(orderId))) {
                                console.warn("Stripe webhook: orderId NON valido", {
                                    eventId: event?.id,
                                    type: event?.type,
                                    orderId: String(orderId),
                                });
                                break;
                            }

                            const _id = new mongoose.Types.ObjectId(String(orderId));

                            await ordersCol.updateOne(
                                { _id, status: { $ne: "paid" } },
                                {
                                    $set: {
                                        status: "paid",
                                        paidAt: new Date(),
                                        paymentProvider: "stripe",
                                        stripeCheckoutSessionId: session?.id || null,
                                        stripePaymentIntentId: session?.payment_intent || null,
                                        updatedAt: new Date(),
                                    },
                                }
                            );

                            const order = await ordersCol.findOne({ _id });
                            if (!order) {
                                console.warn("Stripe webhook: ordine non trovato dopo update", {
                                    eventId: event?.id,
                                    orderId: String(orderId),
                                });
                                break;
                            }

                            if (order.paymentEmailSentAt) break;

                            const to =
                                order?.shippingAddress?.email ||
                                session?.customer_details?.email ||
                                session?.customer_email ||
                                null;

                            if (!to) {
                                console.warn("Stripe webhook: email NON inviata, destinatario mancante", {
                                    orderId: String(orderId),
                                    publicId: order?.publicId,
                                    shipEmail: order?.shippingAddress?.email,
                                    stripeEmail: session?.customer_details?.email || session?.customer_email,
                                });
                                break;
                            }

                            console.log("Stripe webhook: invio email pagamento (async)", {
                                orderId: String(orderId),
                                to,
                                sessionId: session?.id,
                            });

                            try {
                                await sendOrderPaymentConfirmedEmail({ to, order, includeItems: true });

                                await ordersCol.updateOne(
                                    { _id, paymentEmailSentAt: { $exists: false } },
                                    { $set: { paymentEmailSentAt: new Date() } }
                                );

                                console.log("Stripe webhook: email pagamento inviata", {
                                    orderId: String(orderId),
                                    to,
                                });
                            } catch (mailErr) {
                                console.error("Email pagamento Stripe fallita:", mailErr?.message || mailErr);
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
                                eventId: event?.id,
                            });
                            break;
                    }

                    console.log("✅ Stripe webhook: async processing completato", {
                        eventId: event?.id,
                        type: event?.type,
                    });
                } catch (err) {
                    console.error("❌ Stripe webhook handler async error:", err);
                }
            });

            return;
        }
    );

    return router;
};