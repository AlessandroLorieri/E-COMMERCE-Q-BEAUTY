const Address = require("./addresses.schema");
const { normalizeShippingAddress } = require("../utils/normalizers/address.normalizer");

async function listMyAddresses(userId) {
    return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

async function createAddress(userId, payload) {
    const a = normalizeShippingAddress(payload || {});

    const existingCount = await Address.countDocuments({ user: userId });
    const isDefault = existingCount === 0 ? true : !!payload?.isDefault;

    if (isDefault) {
        await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
    }

    const created = await Address.create({
        user: userId,
        label: String(payload?.label || "").trim(),
        isDefault,
        ...a,
    });

    return created;
}

async function setDefaultAddress(userId, addressId) {
    const addr = await Address.findOne({ _id: addressId, user: userId });
    if (!addr) {
        const err = new Error("Address not found");
        err.status = 404;
        throw err;
    }

    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
    addr.isDefault = true;
    await addr.save();
    return addr;
}

module.exports = { listMyAddresses, createAddress, setDefaultAddress };
