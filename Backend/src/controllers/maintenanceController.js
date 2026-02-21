const pool = require("../db/connection");

/* ──────────────────────────────────────────────
   GET ALL MAINTENANCE LOGS
────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
  try {
    const { vehicle_id } = req.query;

    let sql = `
      SELECT m.*,
             v.name AS vehicle_name,
             v.plate_number
      FROM maintenance_logs m
      LEFT JOIN vehicles v ON v.id = m.vehicle_id
    `;

    const params = [];

    if (vehicle_id) {
      sql += " WHERE m.vehicle_id = $1";
      params.push(vehicle_id);
    }

    sql += " ORDER BY m.created_at DESC";

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
   GET ONE LOG
────────────────────────────────────────────── */
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT m.*,
             v.name AS vehicle_name,
             v.plate_number
      FROM maintenance_logs m
      LEFT JOIN vehicles v ON v.id = m.vehicle_id
      WHERE m.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Maintenance log not found",
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
   CREATE MAINTENANCE LOG
   → sets vehicle IN_SHOP
────────────────────────────────────────────── */
const create = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { vehicle_id, description, cost } = req.body;

    if (!vehicle_id || !description) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "vehicle_id and description required",
      });
    }

    /* ---- VEHICLE CHECK ---- */
    const vRes = await client.query(
      "SELECT id, status FROM vehicles WHERE id=$1",
      [vehicle_id]
    );

    if (!vRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const vehicle = vRes.rows[0];

    if (vehicle.status === "ON_TRIP") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Vehicle is ON_TRIP — cannot log maintenance",
      });
    }

    /* ---- INSERT LOG ---- */
    const result = await client.query(
      `
      INSERT INTO maintenance_logs
      (vehicle_id, description, cost)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [vehicle_id, description, parseInt(cost) || 0]
    );

    /* ---- SET VEHICLE IN_SHOP ---- */
    await client.query(
      "UPDATE vehicles SET status='IN_SHOP' WHERE id=$1",
      [vehicle_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Maintenance logged. Vehicle set to IN_SHOP",
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

/* ──────────────────────────────────────────────
   DELETE LOG
────────────────────────────────────────────── */
const remove = async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM maintenance_logs WHERE id=$1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Maintenance log not found",
      });
    }

    res.json({
      success: true,
      message: "Maintenance log deleted",
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   RELEASE VEHICLE
   → AVAILABLE
────────────────────────────────────────────── */
const releaseVehicle = async (req, res, next) => {
  try {
    const result = await pool.query(
      "UPDATE vehicles SET status='AVAILABLE' WHERE id=$1 RETURNING *",
      [req.params.vehicle_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle released to AVAILABLE",
      data: result.rows[0],
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
  releaseVehicle,
};