const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

const register = async ({ name, email, password, role }) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    const err = new Error('Email already registered.');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, password_hash, role || 'DISPATCHER']
  );

  const user = result.rows[0];
  const token = signToken(user);
  return { user, token };
};

const login = async ({ email, password }) => {
  const result = await query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated.');
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const { password_hash, ...safeUser } = user;
  const token = signToken(safeUser);
  return { user: safeUser, token };
};

const listUsers = async () => {
  const result = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

const toggleUserActive = async (id) => {
  const result = await query(
    `UPDATE users SET is_active = NOT is_active WHERE id = $1
     RETURNING id, name, email, role, is_active`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

module.exports = { register, login, listUsers, toggleUserActive };
