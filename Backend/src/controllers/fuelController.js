const pool = require("../db/connection");

/* ──────────────────────────────────────────────
   GET ALL FUEL LOGS
────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
  try {
    const { vehicle_id } = req.query;

    let sql = `
      SELECT f.*,
             v.name AS vehicle_name,
             v.plate_number
      FROM fuel_logs f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
    `;

    const params = [];

    if (vehicle_id) {
      sql += " WHERE f.vehicle_id = $1";
      params.push(vehicle_id);
    }

    sql += " ORDER BY f.created_at DESC";

    const result = await pool.query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   GET ONE FUEL LOG
────────────────────────────────────────────── */
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT f.*,
             v.name AS vehicle_name,
             v.plate_number
      FROM fuel_logs f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Fuel log not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   CREATE FUEL LOG
────────────────────────────────────────────── */
const create = async (req, res, next) => {
  try {
    const { vehicle_id, liters, cost } = req.body;

    if (!vehicle_id || !liters || !cost) {
      return res.status(400).json({
        success: false,
        message: "vehicle_id, liters, cost required",
      });
    }

    /* ---- VEHICLE CHECK ---- */
    const vRes = await pool.query(
      "SELECT id FROM vehicles WHERE id=$1",
      [vehicle_id]
    );

    if (!vRes.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    /* ---- INSERT ---- */
    const result = await pool.query(
      `
      INSERT INTO fuel_logs
      (vehicle_id, liters, cost)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [vehicle_id, parseInt(liters), parseInt(cost)]
    );

    res.status(201).json({
      success: true,
      message: "Fuel log created",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   DELETE FUEL LOG
────────────────────────────────────────────── */
const remove = async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM fuel_logs WHERE id=$1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Fuel log not found",
      });
    }

    res.json({
      success: true,
      message: "Fuel log deleted",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  remove,
};