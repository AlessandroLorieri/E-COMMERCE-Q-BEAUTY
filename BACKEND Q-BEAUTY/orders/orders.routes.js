const express = require("express");
const { authRequired, adminOnly  } = require("../middleware/auth.middleware");
const controller = require("./orders.controller");

const router = express.Router();

// POST quote
router.post("/quote", authRequired, controller.quote);

// POST(crea ordine)
router.post("/", authRequired, controller.create);

// GET  (lista ordini utente)
router.get("/me", authRequired, controller.mine);

// PATCH (simula pagamento)
router.patch("/:id/pay-demo", authRequired, controller.payDemo);


// ADMIN - gestione ordini
// GET (lista ordini)
router.get("/admin", authRequired, adminOnly, controller.adminList);
// GET (KPI dashboard)
router.get("/admin/stats", authRequired, adminOnly, controller.adminStats);
router.get("/admin/stats/years", authRequired, adminOnly, controller.adminStatsYears);


// GET (dettaglio ordine)
router.get("/admin/:id", authRequired, adminOnly, controller.adminGet);

// PATCH (cambio stato)
router.patch("/admin/:id/status", authRequired, adminOnly, controller.adminSetStatus);
router.patch("/admin/:id/cancel", authRequired, adminOnly, controller.adminCancel);

module.exports = router;
