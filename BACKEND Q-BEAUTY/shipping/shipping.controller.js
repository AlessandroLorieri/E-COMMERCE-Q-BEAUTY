const {
    getShippingSettings,
    updateShippingSettings,
} = require("./shipping.services");

async function adminGetShippingSettings(req, res) {
    try {
        const settings = await getShippingSettings();
        return res.json({ settings });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors,
        });
    }
}

async function adminUpdateShippingSettings(req, res) {
    try {
        const settings = await updateShippingSettings(req.body);
        return res.json({ settings });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors,
        });
    }
}

module.exports = {
    adminGetShippingSettings,
    adminUpdateShippingSettings,
};