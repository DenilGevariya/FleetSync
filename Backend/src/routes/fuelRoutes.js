const router = require('express').Router();
const { body, param } = require('express-validator');
const controller = require('../controllers/fuelController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// GET /api/fuel
router.get('/', controller.getAll);

// GET /api/fuel/:id
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

// POST /api/fuel  (MANAGER, DISPATCHER, FINANCE)
router.post(
  '/',
  authorize('MANAGER', 'DISPATCHER', 'FINANCE'),
  [
    body('vehicle_id').isUUID().withMessage('Valid vehicle_id UUID required.'),
    body('trip_id').optional().isUUID(),
    body('liters').isFloat({ gt: 0 }).withMessage('Liters must be positive.'),
    body('cost_per_liter').isFloat({ gt: 0 }).withMessage('Cost per liter must be positive.'),
    body('odometer_at_fill').optional().isFloat({ min: 0 }),
    body('fuel_date').optional().isDate(),
  ],
  validate,
  controller.create
);

// DELETE /api/fuel/:id  (MANAGER, FINANCE)
router.delete(
  '/:id',
  authorize('MANAGER', 'FINANCE'),
  param('id').isUUID(),
  validate,
  controller.remove
);

module.exports = router;
