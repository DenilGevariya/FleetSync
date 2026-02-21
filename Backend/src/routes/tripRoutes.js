const router = require('express').Router();
const { body, param } = require('express-validator');
const controller = require('../controllers/tripController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// GET /api/trips
router.get('/', controller.getAll);

// GET /api/trips/:id
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

// POST /api/trips  (MANAGER, DISPATCHER)
router.post(
  '/',
  authorize('MANAGER', 'DISPATCHER'),
  [
    body('vehicle_id').isUUID().withMessage('Valid vehicle_id UUID required.'),
    body('driver_id').isUUID().withMessage('Valid driver_id UUID required.'),
    body('origin').trim().notEmpty().withMessage('Origin is required.'),
    body('destination').trim().notEmpty().withMessage('Destination is required.'),
    body('cargo_weight_kg').isFloat({ gt: 0 }).withMessage('cargo_weight_kg must be positive.'),
    body('scheduled_at').optional().isISO8601(),
  ],
  validate,
  controller.create
);

// POST /api/trips/:id/dispatch  (MANAGER, DISPATCHER)
router.post(
  '/:id/dispatch',
  authorize('MANAGER', 'DISPATCHER'),
  param('id').isUUID(),
  body('start_odometer').optional().isFloat({ min: 0 }),
  validate,
  controller.dispatch
);

// POST /api/trips/:id/complete  (MANAGER, DISPATCHER)
router.post(
  '/:id/complete',
  authorize('MANAGER', 'DISPATCHER'),
  param('id').isUUID(),
  body('end_odometer').optional().isFloat({ min: 0 }),
  validate,
  controller.complete
);

// POST /api/trips/:id/cancel  (MANAGER, DISPATCHER)
router.post(
  '/:id/cancel',
  authorize('MANAGER', 'DISPATCHER'),
  param('id').isUUID(),
  validate,
  controller.cancel
);

module.exports = router;
