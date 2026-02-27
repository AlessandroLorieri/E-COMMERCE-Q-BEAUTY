const { listMyAddresses, createAddress, setDefaultAddress } = require("./addresses.services");

async function me(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const addresses = await listMyAddresses(userId);
        return res.json({ addresses });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Server error" });
    }
}

async function create(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const created = await createAddress(userId, req.body);
        return res.status(201).json({ address: created });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Server error" });
    }
}

async function setDefault(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const updated = await setDefaultAddress(userId, req.params.id);
        return res.json({ address: updated });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Server error" });
    }
}

module.exports = { me, create, setDefault };
