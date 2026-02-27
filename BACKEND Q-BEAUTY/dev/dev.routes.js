const express = require("express");

module.exports = function makeDevRouter({ verifySmtp, sendWelcomeEmail, sendTestEmail }) {

    const router = express.Router();

    router.post("/test-welcome", async (req, res) => {
        try {
            await verifySmtp();

            await sendWelcomeEmail({
                to: req.body?.to || process.env.MAIL_TEST_TO,
                name: req.body?.name || "Alessandro",
            });

            res.json({ ok: true, message: "Welcome email inviata." });
        } catch (err) {
            console.error("TEST WELCOME ERROR:", err);
            res.status(500).json({ ok: false, message: err?.message || "Errore invio welcome" });
        }
    });

    router.post("/test-email", async (req, res) => {
    try {
        await verifySmtp();

        await sendTestEmail({
            to: req.body?.to || process.env.MAIL_TEST_TO,
        });

        res.json({ ok: true, message: "Email inviata (controlla inbox/spam)." });
    } catch (err) {
        console.error("TEST EMAIL ERROR:", err);
        res.status(500).json({ ok: false, message: err?.message || "Errore invio email" });
    }
});

    return router;
};
