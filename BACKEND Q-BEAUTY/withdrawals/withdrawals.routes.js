
const express = require("express");
const rateLimit = require("express-rate-limit");

const Withdrawal = require("./withdrawals.model");

const {
    sendWithdrawalCustomerEmail,
    sendWithdrawalAdminEmail,
} = require("./withdrawals.mailer");

const router = express.Router();

const withdrawalLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Troppe richieste. Riprova più tardi oppure contatta assistenza@qbeautyshop.it.",
    },
});

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

router.post("/", withdrawalLimiter, async (req, res) => {
    try {
        const name = clean(req.body?.name);
        const email = clean(req.body?.email).toLowerCase();
        const orderNumber = clean(req.body?.orderNumber);
        const products = clean(req.body?.products);
        const confirmed = req.body?.confirmed === true;

        if (
            !name ||
            name.length > 120 ||
            !email ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            !orderNumber ||
            orderNumber.length > 50 ||
            !products ||
            products.length > 2000 ||
            !confirmed
        ) {
            return res.status(400).json({
                message: "Controlla i dati inseriti e conferma la dichiarazione di recesso.",
            });
        }

        // La dichiarazione viene salvata prima delle email.
        const withdrawal = await Withdrawal.create({
            name,
            email,
            orderNumber,
            products,
            declaration:
                "Comunico espressamente la mia volontà di recedere dal contratto di acquisto.",
        });

        // Le due email sono indipendenti.
        const [customerResult, adminResult] = await Promise.allSettled([
            sendWithdrawalCustomerEmail(withdrawal),
            sendWithdrawalAdminEmail(withdrawal),
        ]);

        const update = {};

        if (customerResult.status === "fulfilled") {
            update.customerEmailSentAt = new Date();
        } else {
            console.error(
                "Errore email recesso cliente:",
                withdrawal._id,
                customerResult.reason
            );
        }

        if (adminResult.status === "fulfilled") {
            update.adminEmailSentAt = new Date();
        } else {
            console.error(
                "Errore email recesso amministratore:",
                withdrawal._id,
                adminResult.reason
            );
        }

        if (Object.keys(update).length > 0) {
            try {
                await Withdrawal.updateOne(
                    { _id: withdrawal._id },
                    { $set: update }
                );
            } catch (error) {
                console.error(
                    "Errore aggiornamento stato email recesso:",
                    withdrawal._id,
                    error
                );
            }
        }

        const confirmationSent = customerResult.status === "fulfilled";

        return res.status(201).json({
            success: true,
            reference: String(withdrawal._id),
            receivedAt: withdrawal.receivedAt,
            confirmationSent,
            message: confirmationSent
                ? "Dichiarazione registrata. Conferma email inviata."
                : "Dichiarazione registrata, ma la conferma email non è stata inviata. Conserva il numero di riferimento.",
        });
    } catch (error) {
        console.error("Errore registrazione recesso:", error);

        return res.status(500).json({
            success: false,
            message:
                "Non è stato possibile confermare la registrazione. Contatta assistenza@qbeautyshop.it.",
        });
    }
});

module.exports = router;
