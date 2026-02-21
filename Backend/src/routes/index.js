const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");

const authCtrl    = require("../controllers/authController");
const vehicleCtrl = require("../controllers/vehicleController");
const driverCtrl  = require("../controllers/driverController");
const tripCtrl    = require("../controllers/tripController");
const maintCtrl   = require("../controllers/maintenanceController");
const fuelCtrl    = require("../controllers/fuelController");
const analyticsCtrl = require("../controllers/analyticsController");

// ─── AUTH ─────────────────────────────────────────────────────────────────────
router.post("/auth/register", authCtrl.register);
router.post("/auth/login",    authCtrl.login);
router.get("/auth/me",        authenticate, authCtrl.getMe);
router.get("/auth/users",     authenticate, authorize("MANAGER"), authCtrl.listUsers);

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
router.get("/vehicles",           authenticate, vehicleCtrl.getAll);
router.get("/vehicles/:id",       authenticate, vehicleCtrl.getOne);
router.post("/vehicles",          authenticate, authorize("MANAGER"), vehicleCtrl.create);
router.put("/vehicles/:id",       authenticate, authorize("MANAGER"), vehicleCtrl.update);
router.patch("/vehicles/:id/status", authenticate, authorize("MANAGER"), vehicleCtrl.setStatus);
router.delete("/vehicles/:id",    authenticate, authorize("MANAGER"), vehicleCtrl.remove);

// ─── DRIVERS ──────────────────────────────────────────────────────────────────
router.get("/drivers",            authenticate, driverCtrl.getAll);
router.get("/drivers/:id",        authenticate, driverCtrl.getOne);
router.post("/drivers",           authenticate, authorize("MANAGER", "SAFETY"), driverCtrl.create);
router.put("/drivers/:id",        authenticate, authorize("MANAGER", "SAFETY"), driverCtrl.update);
router.patch("/drivers/:id/status", authenticate, authorize("MANAGER", "SAFETY"), driverCtrl.setStatus);
router.delete("/drivers/:id",     authenticate, authorize("MANAGER"), driverCtrl.remove);

// ─── TRIPS ────────────────────────────────────────────────────────────────────
router.get("/trips",              authenticate, tripCtrl.getAll);
router.get("/trips/:id",          authenticate, tripCtrl.getOne);
router.post("/trips",             authenticate, authorize("MANAGER", "DISPATCHER"), tripCtrl.create);
router.post("/trips/:id/dispatch",authenticate, authorize("MANAGER", "DISPATCHER"), tripCtrl.dispatch);
router.post("/trips/:id/complete",authenticate, authorize("MANAGER", "DISPATCHER"), tripCtrl.complete);
router.post("/trips/:id/cancel",  authenticate, authorize("MANAGER", "DISPATCHER"), tripCtrl.cancel);

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
router.get("/maintenance",                    authenticate, maintCtrl.getAll);
router.get("/maintenance/:id",                authenticate, maintCtrl.getOne);
router.post("/maintenance",                   authenticate, authorize("MANAGER"), maintCtrl.create);
router.delete("/maintenance/:id",             authenticate, authorize("MANAGER"), maintCtrl.remove);
router.post("/maintenance/release/:vehicle_id", authenticate, authorize("MANAGER"), maintCtrl.releaseVehicle);

// ─── FUEL ─────────────────────────────────────────────────────────────────────
router.get("/fuel",               authenticate, fuelCtrl.getAll);
router.get("/fuel/:id",           authenticate, fuelCtrl.getOne);
router.post("/fuel",              authenticate, authorize("MANAGER", "DISPATCHER", "FINANCE"), fuelCtrl.create);
router.delete("/fuel/:id",        authenticate, authorize("MANAGER", "FINANCE"), fuelCtrl.remove);

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
router.get("/analytics/dashboard",           authenticate, analyticsCtrl.dashboard);
router.get("/analytics/fuel-summary",        authenticate, authorize("MANAGER","FINANCE"), analyticsCtrl.fuelSummary);
router.get("/analytics/maintenance-summary", authenticate, authorize("MANAGER","FINANCE"), analyticsCtrl.maintenanceSummary);
router.get("/analytics/trip-stats",          authenticate, authorize("MANAGER","DISPATCHER"), analyticsCtrl.tripStats);
router.get("/analytics/monthly-costs",       authenticate, authorize("MANAGER","FINANCE"), analyticsCtrl.monthlyCosts);

module.exports = router;