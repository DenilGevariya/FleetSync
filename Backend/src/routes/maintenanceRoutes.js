const router = require('express').Router();
const { body, param } = require('express-validator');
const controller = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// GET /api/maintenance
router.get('/', controller.getAll);

// GET /api/maintenance/:id
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

// POST /api/maintenance  (MANAGER only)
router.post(
  '/',
  authorize('MANAGER'),
  [
    body('vehicle_id').isUUID().withMessage('Valid vehicle_id UUID required.'),
    body('service_type').trim().notEmpty().withMessage('Service type is required.'),
    body('cost').optional().isFloat({ min: 0 }),
    body('service_date').optional().isDate(),
    body('odometer_at_service').optional().isFloat({ min: 0 }),
  ],
  validate,
  controller.create
);

// PUT /api/maintenance/:id  (MANAGER only)
router.put(
  '/:id',
  authorize('MANAGER'),
  param('id').isUUID(),
  [
    body('cost').optional().isFloat({ min: 0 }),
    body('service_date').optional().isDate(),
  ],
  validate,
  controller.update
);

// POST /api/maintenance/:id/resolve  (MANAGER only)
router.post(
  '/:id/resolve',
  authorize('MANAGER'),
  param('id').isUUID(),
  validate,
  controller.resolve
);

module.exports = router;
