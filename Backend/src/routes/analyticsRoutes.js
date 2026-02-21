const router = require('express').Router();
const { query: qv } = require('express-validator');
const controller = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// GET /api/analytics/dashboard  (All roles)
router.get('/dashboard', controller.getDashboard);

// GET /api/analytics/fuel-efficiency  (MANAGER, FINANCE)
router.get(
  '/fuel-efficiency',
  authorize('MANAGER', 'FINANCE'),
  qv('vehicle_id').optional().isUUID(),
  validate,
  controller.getFuelEfficiency
);

// GET /api/analytics/cost-per-km  (MANAGER, FINANCE)
router.get(
  '/cost-per-km',
  authorize('MANAGER', 'FINANCE'),
  qv('vehicle_id').optional().isUUID(),
  validate,
  controller.getCostPerKm
);

// GET /api/analytics/vehicle-roi  (MANAGER, FINANCE)
router.get(
  '/vehicle-roi',
  authorize('MANAGER', 'FINANCE'),
  qv('vehicle_id').optional().isUUID(),
  validate,
  controller.getVehicleROI
);

// GET /api/analytics/utilization  (MANAGER, FINANCE, DISPATCHER)
router.get(
  '/utilization',
  authorize('MANAGER', 'FINANCE', 'DISPATCHER'),
  controller.getUtilization
);

// GET /api/analytics/driver-performance  (MANAGER, SAFETY)
router.get(
  '/driver-performance',
  authorize('MANAGER', 'SAFETY'),
  controller.getDriverPerformance
);

// GET /api/analytics/financial-summary  (MANAGER, FINANCE)
router.get(
  '/financial-summary',
  authorize('MANAGER', 'FINANCE'),
  qv('year').optional().isInt({ min: 2000, max: 2100 }),
  validate,
  controller.getFinancialSummary
);

module.exports = router;
