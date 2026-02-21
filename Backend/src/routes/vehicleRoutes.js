const router = require('express').Router();
const { body, param } = require('express-validator');
const controller = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const TYPES = ['TRUCK', 'VAN', 'BIKE', 'CAR', 'OTHER'];
const STATUSES = ['AVAILABLE', 'IN_SHOP', 'RETIRED'];

// All vehicle routes require authentication
router.use(authenticate);

// GET /api/vehicles
router.get('/', controller.getAll);

// GET /api/vehicles/:id
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

// POST /api/vehicles  (MANAGER only)
router.post(
  '/',
  authorize('MANAGER'),
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('model').trim().notEmpty().withMessage('Model is required.'),
    body('license_plate').trim().notEmpty().withMessage('License plate is required.'),
    body('vehicle_type').optional().isIn(TYPES).withMessage(`Type must be: ${TYPES.join(', ')}`),
    body('max_capacity_kg')
      .isFloat({ gt: 0 })
      .withMessage('max_capacity_kg must be a positive number.'),
    body('odometer_km').optional().isFloat({ min: 0 }),
    body('acquisition_cost').optional().isFloat({ min: 0 }),
  ],
  validate,
  controller.create
);

// PUT /api/vehicles/:id  (MANAGER only)
router.put(
  '/:id',
  authorize('MANAGER'),
  param('id').isUUID(),
  [
    body('max_capacity_kg').optional().isFloat({ gt: 0 }),
    body('odometer_km').optional().isFloat({ min: 0 }),
    body('acquisition_cost').optional().isFloat({ min: 0 }),
    body('vehicle_type').optional().isIn(TYPES),
  ],
  validate,
  controller.update
);

// PATCH /api/vehicles/:id/status  (MANAGER only)
router.patch(
  '/:id/status',
  authorize('MANAGER'),
  param('id').isUUID(),
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  validate,
  controller.setStatus
);

// DELETE /api/vehicles/:id  (MANAGER only)
router.delete('/:id', authorize('MANAGER'), param('id').isUUID(), validate, controller.remove);

module.exports = router;
