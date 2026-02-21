const pool = require("../db/connection");

/* ──────────────────────────────────────────────
   GET ALL TRIPS
────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT t.*,
             v.name AS vehicle_name,
             v.plate_number,
             v.capacity,
             d.name AS driver_name,
             d.license_number
      FROM trips t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
    `;

    const params = [];

    if (status) {
      sql += " WHERE t.status = $1";
      params.push(status);
    }

    sql += " ORDER BY t.created_at DESC";

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
   GET ONE TRIP
────────────────────────────────────────────── */
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT t.*,
             v.name AS vehicle_name,
             v.plate_number,
             v.capacity,
             d.name AS driver_name,
             d.license_number
      FROM trips t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE t.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
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
   CREATE TRIP (DRAFT)
────────────────────────────────────────────── */
const create = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { vehicle_id, driver_id, origin, destination, cargo_weight } =
      req.body;

    if (!vehicle_id || !driver_id || !origin || !destination || !cargo_weight) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message:
          "vehicle_id, driver_id, origin, destination, cargo_weight required",
      });
    }

    /* ---- VEHICLE CHECK ---- */
    const vRes = await client.query(
      "SELECT id, capacity, status FROM vehicles WHERE id=$1",
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

    if (vehicle.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Vehicle not available (${vehicle.status})`,
      });
    }

    if (parseInt(cargo_weight) > vehicle.capacity) {
      await client.query("ROLLBACK");
      return res.status(422).json({
        success: false,
        message: `Cargo exceeds vehicle capacity (${vehicle.capacity})`,
      });
    }

    /* ---- DRIVER CHECK ---- */
    const dRes = await client.query(
      "SELECT id, status, license_expiry FROM drivers WHERE id=$1",
      [driver_id]
    );

    if (!dRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    const driver = dRes.rows[0];

    if (driver.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Driver not available (${driver.status})`,
      });
    }

    /* ---- LICENSE CHECK ---- */
    if (driver.license_expiry) {
      const today = new Date();
      const expiry = new Date(driver.license_expiry);

      if (expiry < today) {
        await client.query("ROLLBACK");
        return res.status(422).json({
          success: false,
          message: "Driver license expired",
        });
      }
    }

    /* ---- INSERT TRIP ---- */
    const result = await client.query(
      `
      INSERT INTO trips
      (vehicle_id, driver_id, origin, destination, cargo_weight, status)
      VALUES ($1,$2,$3,$4,$5,'DRAFT')
      RETURNING *
      `,
      [vehicle_id, driver_id, origin, destination, parseInt(cargo_weight)]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Trip created",
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
   DISPATCH TRIP
────────────────────────────────────────────── */
const dispatch = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tRes = await client.query(
      "SELECT * FROM trips WHERE id=$1",
      [req.params.id]
    );

    if (!tRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const trip = tRes.rows[0];

    if (trip.status !== "DRAFT") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Trip not dispatchable (${trip.status})`,
      });
    }
    

    /* vehicle + driver availability */
    await client.query(
      "UPDATE vehicles SET status='ON_TRIP' WHERE id=$1",
      [trip.vehicle_id]
    );

    await client.query(
      "UPDATE drivers SET status='ON_TRIP' WHERE id=$1",
      [trip.driver_id]
    );

    await client.query(
      "UPDATE trips SET status='DISPATCHED' WHERE id=$1",
      [req.params.id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Trip dispatched",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

/* ──────────────────────────────────────────────
   COMPLETE TRIP
────────────────────────────────────────────── */
// POST /api/trips/:id/complete
const complete = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query(
      "SELECT * FROM trips WHERE id = $1",
      [req.params.id]
    );

    if (!tRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Trip not found."
      });
    }

    const trip = tRes.rows[0];

    // 🚨 DRIVER restriction
    if (req.user.role === "DRIVER" && trip.driver_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You can only complete your assigned trips."
      });
    }

    if (trip.status !== "DISPATCHED") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Trip cannot be completed. Status: ${trip.status}`
      });
    }

    await client.query(
      "UPDATE trips SET status = 'COMPLETED' WHERE id = $1",
      [req.params.id]
    );

    await client.query(
      "UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1",
      [trip.vehicle_id]
    );

    await client.query(
      "UPDATE drivers SET status = 'AVAILABLE' WHERE id = $1",
      [trip.driver_id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Trip completed. Vehicle and driver are now AVAILABLE."
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
/* ──────────────────────────────────────────────
   CANCEL TRIP
────────────────────────────────────────────── */
const cancel = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tRes = await client.query(
      "SELECT * FROM trips WHERE id=$1",
      [req.params.id]
    );

    if (!tRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const trip = tRes.rows[0];

    if (!["DRAFT", "DISPATCHED"].includes(trip.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: `Cannot cancel (${trip.status})`,
      });
    }

    await client.query(
      "UPDATE trips SET status='CANCELLED' WHERE id=$1",
      [req.params.id]
    );

    if (trip.status === "DISPATCHED") {
      await client.query(
        "UPDATE vehicles SET status='AVAILABLE' WHERE id=$1",
        [trip.vehicle_id]
      );

      await client.query(
        "UPDATE drivers SET status='AVAILABLE' WHERE id=$1",
        [trip.driver_id]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Trip cancelled",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  dispatch,
  complete,
  cancel,
};