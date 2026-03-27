const {
    registerUser,
    loginUser,
    getMe,
    changePasswordUser,
    updateMeUser,
    requestPasswordReset,
    resetPasswordWithToken,
    adminListUsers,
} = require("./authorization.services");

const { sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/mailer");

function mapMongooseError(err) {
    if (err && err.code === 11000) {
        const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
        const msg = field === "email" ? "Email già registrata" : "Valore già presente";
        return { status: 409, message: msg, errors: { [field]: msg } };
    }

    if (err && err.name === "ValidationError" && err.errors) {
        const errors = {};
        for (const [k, v] of Object.entries(err.errors)) {
            errors[k] = v?.message || "Valore non valido";
        }
        const firstMsg = errors[Object.keys(errors)[0]] || "Validazione fallita";
        return { status: 422, message: firstMsg, errors };
    }

    return null;
}

function parsePagination(query) {
    const pageRaw = Number(query?.page || 1);
    const limitRaw = Number(query?.limit || 20);

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 20;

    return { page, limit };
}

async function register(req, res) {
    try {
        const result = await registerUser(req.body);

        const to = result?.user?.email;
        const name = result?.user?.firstName || "";

        if (to) {
            sendWelcomeEmail({ to, name }).catch((err) => {
                console.error("Welcome email fallita:", err?.message || err);
            });
        } else {
            console.warn("Welcome email non inviata: result.user.email mancante");
        }

        return res.status(201).json(result);
    } catch (err) {
        if (err?.status) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message || "Server error" });
        }

        const mapped = mapMongooseError(err);
        if (mapped) {
            return res.status(mapped.status).json({
                message: mapped.message,
                errors: mapped.errors,
            });
        }

        return res.status(500).json({ message: err?.message || "Server error" });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body || {};
        const result = await loginUser(email, password);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

async function me(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const result = await getMe(userId);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}

/* PATCH password */
async function changePassword(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { currentPassword, newPassword } = req.body || {};
        const result = await changePasswordUser(userId, currentPassword, newPassword);

        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function updateMe(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const result = await updateMeUser(userId, req.body);
        return res.json(result);
    } catch (err) {
        if (err?.status) {
            const status = err.status || 500;
            return res.status(status).json({
                message: err.message || "Server error",
                errors: err.errors || undefined,
            });
        }

        const mapped = mapMongooseError(err);
        if (mapped) {
            return res.status(mapped.status).json({
                message: mapped.message,
                errors: mapped.errors,
            });
        }

        return res.status(500).json({
            message: err?.message || "Server error",
        });
    }
}

/* POST forgot-password */
async function forgotPassword(req, res) {
    try {
        const email = req.body?.email ? String(req.body.email).trim() : "";
        if (!email) return res.status(400).json({ message: "Email richiesta" });

        const r = await requestPasswordReset(email);

        if (r?.token && r?.to) {
            const base = String(process.env.PUBLIC_SITE_URL || "")
                .trim()
                .replace(/\/+$/, "");

            const resetUrl = `${base}/shop/reset-password?token=${encodeURIComponent(r.token)}`;

            if (typeof sendPasswordResetEmail === "function") {
                sendPasswordResetEmail({ to: r.to, name: r.name || "", resetUrl }).catch((err) => {
                    console.error("Reset email fallita:", err?.message || err);
                });
            } else {
                console.warn("sendPasswordResetEmail non presente in utils/mailer.js");
            }
        }

        return res.json({ ok: true });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || "Server error" });
    }
}


/* POST reset-password */
async function resetPassword(req, res) {
    try {
        const token = req.body?.token ? String(req.body.token).trim() : "";
        const newPassword = req.body?.newPassword ? String(req.body.newPassword) : "";

        if (!token) {
            return res.status(400).json({ message: "Token mancante" });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: "Password non valida" });
        }

        const result = await resetPasswordWithToken(token, newPassword);
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

async function adminUsers(req, res) {
    try {
        const { page, limit } = parsePagination(req.query);
        const q = req.query?.q ? String(req.query.q).trim() : undefined;

        const result = await adminListUsers({ page, limit, q });
        return res.json(result);
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({
            message: err.message || "Server error",
            errors: err.errors || undefined,
        });
    }
}

module.exports = {
    register,
    login,
    me,
    changePassword,
    updateMe,
    forgotPassword,
    resetPassword,
    adminUsers,
};
