const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/connection");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "name, email and password are required." });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: "Email already registered." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const validRoles = ["MANAGER", "DISPATCHER", "SAFETY", "FINANCE"];
    const userRole = validRoles.includes(role) ? role : "DISPATCHER";

    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, created_at",
      [name, email, hashed, userRole]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const { password: _, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = (req, res) => {
  res.json({ success: true, data: req.user });
};

// GET /api/auth/users
const listUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, listUsers };