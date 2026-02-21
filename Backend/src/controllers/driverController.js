const pool = require("../db/connection");

/* ──────────────────────────────────────────────
   GET ALL DRIVERS
────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT *,
        CASE
          WHEN license_expiry < CURRENT_DATE THEN true
          ELSE false
        END AS license_expired
      FROM drivers
    `;

    const params = [];

    if (status) {
      sql += " WHERE status = $1";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

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
   GET ONE DRIVER
────────────────────────────────────────────── */
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT *,
        CASE
          WHEN license_expiry < CURRENT_DATE THEN true
          ELSE false
        END AS license_expired
      FROM drivers
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
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
   CREATE DRIVER
────────────────────────────────────────────── */
const create = async (req, res, next) => {
  try {
    const { name, license_number, license_expiry } = req.body;

    if (!name || !license_number || !license_expiry) {
      return res.status(400).json({
        success: false,
        message: "name, license_number, license_expiry required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO drivers
      (name, license_number, license_expiry)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [name, license_number, license_expiry]
    );

    res.status(201).json({
      success: true,
      message: "Driver created",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   UPDATE DRIVER
────────────────────────────────────────────── */
const update = async (req, res, next) => {
  try {
    const { name, license_number, license_expiry } = req.body;

    const result = await pool.query(
      `
      UPDATE drivers SET
        name = COALESCE($1, name),
        license_number = COALESCE($2, license_number),
        license_expiry = COALESCE($3, license_expiry)
      WHERE id = $4
      RETURNING *
      `,
      [name, license_number, license_expiry, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      message: "Driver updated",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   SET DRIVER STATUS
────────────────────────────────────────────── */
const setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowed = ["AVAILABLE", "SUSPENDED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be: ${allowed.join(", ")}`,
      });
    }

    const result = await pool.query(
      "UPDATE drivers SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      message: "Driver status updated",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────────────────────────
   DELETE DRIVER
────────────────────────────────────────────── */
const remove = async (req, res, next) => {
  try {
    const check = await pool.query(
      "SELECT status FROM drivers WHERE id=$1",
      [req.params.id]
    );

    if (!check.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (check.rows[0].status === "ON_TRIP") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete driver ON_TRIP",
      });
    }

    await pool.query(
      "DELETE FROM drivers WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true,
      message: "Driver deleted",
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