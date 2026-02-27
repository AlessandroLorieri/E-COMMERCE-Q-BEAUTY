const {
    listActiveProducts,
    getActiveProductById,
    adminListProducts,
    adminGetProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    hardDeleteProduct,
} = require("./products.services");

async function list(req, res) {
    try {
        const products = await listActiveProducts();
        return res.json({ products });
    } catch (err) {
        console.error("PRODUCT_LIST_ERROR:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

async function getOne(req, res) {
    try {
        const { id } = req.params;
        const product = await getActiveProductById(id);
        return res.json({ product });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminList(req, res) {
    try {
        const page = Math.max(1, Number(req.query?.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 20)));
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        const result = await adminListProducts({ page, limit, q });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function adminGetOne(req, res) {
    try {
        const { id } = req.params;
        const product = await adminGetProductById(id);
        return res.json({ product });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function create(req, res) {
    try {
        const product = await createProduct(req.body);
        return res.status(201).json({ product });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function update(req, res) {
    try {
        const { id } = req.params;
        const product = await updateProduct(id, req.body);
        return res.json({ product });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function remove(req, res) {
    try {
        const { id } = req.params;
        await deleteProduct(id);
        return res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function hardRemove(req, res) {
    try {
        const { id } = req.params;
        await hardDeleteProduct(id);
        return res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

module.exports = {
    list,
    getOne,
    adminList,
    adminGetOne,
    create,
    update,
    remove,
    hardRemove
};
