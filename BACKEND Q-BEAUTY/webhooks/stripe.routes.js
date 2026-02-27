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
                    case "checkout.session.completed": {
                        const session = event.data.object;
                        const orderId = session?.metadata?.orderId;

                        if (!orderId) {
                            console.warn("Stripe webhook: orderId mancante in metadata", {
                                eventId: event?.id,
                                type: event?.type,
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

                        try {
                            await sendOrderPaymentConfirmedEmail({ to, order, includeItems: true });

                            await ordersCol.updateOne(
                                { _id, paymentEmailSentAt: { $exists: false } },
                                { $set: { paymentEmailSentAt: new Date() } }
                            );
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

                    default:
                        break;
                }

                return res.status(200).json({ received: true });
            } catch (err) {
                console.error("❌ Stripe webhook handler error:", err);
                return res.status(500).json({ message: "Webhook handler error" });
            }
        }
    );

    return router;
};
