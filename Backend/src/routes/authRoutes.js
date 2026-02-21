const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const ROLES = ['MANAGER', 'DISPATCHER', 'SAFETY', 'FINANCE'];

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('role').optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  ],
  validate,
  controller.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  controller.login
);

// GET /api/auth/me
router.get('/me', authenticate, controller.getMe);

// GET /api/auth/users  (MANAGER only)
router.get('/users', authenticate, authorize('MANAGER'), controller.listUsers);

// PATCH /api/auth/users/:id/toggle  (MANAGER only)
router.patch('/users/:id/toggle', authenticate, authorize('MANAGER'), controller.toggleUser);

module.exports = router;
