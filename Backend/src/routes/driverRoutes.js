const router = require('express').Router();
const { body, param } = require('express-validator');
const controller = require('../controllers/driverController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const STATUSES = ['ON_DUTY', 'OFF_DUTY', 'SUSPENDED'];

router.use(authenticate);

// GET /api/drivers
router.get('/', controller.getAll);

// GET /api/drivers/:id
router.get('/:id', param('id').isUUID(), validate, controller.getOne);

// POST /api/drivers  (MANAGER, SAFETY)
router.post(
  '/',
  authorize('MANAGER', 'SAFETY'),
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('employee_id').trim().notEmpty().withMessage('Employee ID is required.'),
    body('license_number').trim().notEmpty().withMessage('License number is required.'),
    body('license_category').trim().notEmpty().withMessage('License category is required.'),
    body('license_expiry').isDate().withMessage('Valid license expiry date required (YYYY-MM-DD).'),
    body('phone').optional().isMobilePhone(),
    body('email').optional().isEmail().normalizeEmail(),
    body('safety_score').optional().isFloat({ min: 0, max: 100 }),
  ],
  validate,
  controller.create
);

// PUT /api/drivers/:id  (MANAGER, SAFETY)
router.put(
  '/:id',
  authorize('MANAGER', 'SAFETY'),
  param('id').isUUID(),
  [
    body('license_expiry').optional().isDate(),
    body('safety_score').optional().isFloat({ min: 0, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  validate,
  controller.update
);

// PATCH /api/drivers/:id/status  (MANAGER, SAFETY)
router.patch(
  '/:id/status',
  authorize('MANAGER', 'SAFETY'),
  param('id').isUUID(),
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  validate,
  controller.setStatus
);

// DELETE /api/drivers/:id  (MANAGER only)
router.delete('/:id', authorize('MANAGER'), param('id').isUUID(), validate, controller.remove);

module.exports = router;
