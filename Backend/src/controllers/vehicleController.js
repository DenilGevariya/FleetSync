const pool = require("../db/connection");

/* ──────────────────────────────────────────────
   GET ALL VEHICLES
────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vehicles ORDER BY created_at DESC"
    );

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
   GET ONE VEHICLE
────────────────────────────────────────────── */
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vehicles WHERE id = $1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
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
   CREATE VEHICLE
────────────────────────────────────────────── */
const create = async (req, res, next) => {
  try {
    const { name, plate_number, capacity, status } = req.body;

    if (!name || !plate_number || !capacity) {
      return res.status(400).json({
        success: false,
        message: "name, plate_number, capacity required",
      });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (name, plate_number, capacity, status)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [name, plate_number, capacity, status || "AVAILABLE"]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle created",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   UPDATE VEHICLE
────────────────────────────────────────────── */
const update = async (req, res, next) => {
  try {
    const { name, plate_number, capacity, status } = req.body;

    const result = await pool.query(
      `UPDATE vehicles
       SET name=$1,
           plate_number=$2,
           capacity=$3,
           status=$4
       WHERE id=$5
       RETURNING *`,
      [name, plate_number, capacity, status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle updated",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   SET STATUS
────────────────────────────────────────────── */
const setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE vehicles
       SET status=$1
       WHERE id=$2
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Status updated",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   DELETE VEHICLE
────────────────────────────────────────────── */
const remove = async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM vehicles WHERE id=$1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle deleted",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  setStatus,
  remove,
};