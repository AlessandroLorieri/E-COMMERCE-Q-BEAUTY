const {
    listPublicPartners,
    getPublicPartnerBySlug,
    adminListPartners,
    adminGetPartner,
    adminGetPartnerOrders,
    adminGetPartnerLeaderboard,
    createPartner,
    updatePartner,
    deletePartner,
} = require("./partners.services");

async function publicList(req, res) {
    try {
        const partners = await listPublicPartners();
        return res.json(partners);
    } catch (err) {
        console.error("partners.publicList error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore caricamento partner",
            errors: err.errors || undefined,
        });
    }
}

async function publicGetBySlug(req, res) {
    try {
        const partner = await getPublicPartnerBySlug(req.params.slug);
        return res.json(partner);
    } catch (err) {
        console.error("partners.publicGetBySlug error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore caricamento partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminList(req, res) {
    try {
        const partners = await adminListPartners();
        return res.json(partners);
    } catch (err) {
        console.error("partners.adminList error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore caricamento partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminGet(req, res) {
    try {
        const partner = await adminGetPartner(req.params.id);
        return res.json(partner);
    } catch (err) {
        console.error("partners.adminGet error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore caricamento partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminGetOrders(req, res) {
    try {
        const data = await adminGetPartnerOrders(req.params.id);
        return res.json(data);
    } catch (err) {
        console.error("partners.adminGetOrders error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore caricamento ordini partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminGetLeaderboard(req, res) {
    try {
        const data = await adminGetPartnerLeaderboard();
        return res.json(data);
    } catch (err) {
        console.error("partners.adminGetLeaderboard error:", err);

        return res.status(err.status || 500).json({
            message:
                err.message ||
                "Errore caricamento classifica partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminCreate(req, res) {
    try {
        const partner = await createPartner(req.body || {});
        return res.status(201).json({ partner });
    } catch (err) {
        console.error("partners.adminCreate error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore creazione partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminUpdate(req, res) {
    try {
        const partner = await updatePartner(req.params.id, req.body || {});
        return res.json({ partner });
    } catch (err) {
        console.error("partners.adminUpdate error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore modifica partner",
            errors: err.errors || undefined,
        });
    }
}

async function adminDelete(req, res) {
    try {
        await deletePartner(req.params.id);
        return res.json({ ok: true });
    } catch (err) {
        console.error("partners.adminDelete error:", err);
        return res.status(err.status || 500).json({
            message: err.message || "Errore eliminazione partner",
            errors: err.errors || undefined,
        });
    }
}

module.exports = {
    publicList,
    publicGetBySlug,
    adminList,
    adminGet,
    adminGetOrders,
    adminGetLeaderboard,
    adminCreate,
    adminUpdate,
    adminDelete,
};