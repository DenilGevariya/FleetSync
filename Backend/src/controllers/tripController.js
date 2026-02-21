const pool = require("../db/connection");

// GET /api/trips
const getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT t.*,
        v.name AS vehicle_name, v.plate_number, v.capacity,
        d.name AS driver_name, d.license_number
      FROM trips t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
    `;
    const params = [];
    if (status) { sql += " WHERE t.status = $1"; params.push(status); }
    sql += " ORDER BY t.created_at DESC";
    const result = await pool.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/trips/:id
const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.*,
        v.name AS vehicle_name, v.plate_number, v.capacity,
        d.name AS driver_name, d.license_number
       FROM trips t
       LEFT JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: "Trip not found." });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// POST /api/trips  — Create trip (DRAFT), run all validations
const create = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { vehicle_id, driver_id, origin, destination, cargo_weight } = req.body;

    if (!vehicle_id || !driver_id || !origin || !destination || !cargo_weight) {
      return res.status(400).json({ success: false, message: "vehicle_id, driver_id, origin, destination and cargo_weight are required." });
    }

    // --- Validate vehicle
    const vRes = await client.query("SELECT * FROM vehicles WHERE id = $1", [vehicle_id]);
    if (!vRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }
    const vehicle = vRes.rows[0];
    if (vehicle.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Vehicle is not available. Current status: ${vehicle.status}` });
    }

    // --- Capacity check
    if (parseInt(cargo_weight) > vehicle.capacity) {
      await client.query("ROLLBACK");
      return res.status(422).json({
        success: false,
        message: `Cargo weight (${cargo_weight} kg) exceeds vehicle capacity (${vehicle.capacity} kg).`
      });
    }

    // --- Validate driver
    const dRes = await client.query("SELECT * FROM drivers WHERE id = $1", [driver_id]);
    if (!dRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Driver not found." });
    }
    const driver = dRes.rows[0];
    if (driver.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Driver is not available. Current status: ${driver.status}` });
    }

    // --- License expiry check
    const today = new Date().toISOString().slice(0, 10);
    if (driver.license_expiry && driver.license_expiry.toISOString().slice(0, 10) < today) {
      await client.query("ROLLBACK");
      return res.status(422).json({ success: false, message: `Driver license expired on ${driver.license_expiry.toISOString().slice(0, 10)}.` });
    }

    const result = await client.query(
      `INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight, status)
       VALUES ($1,$2,$3,$4,$5,'DRAFT') RETURNING *`,
      [vehicle_id, driver_id, origin, destination, parseInt(cargo_weight)]
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, message: "Trip created.", data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
};

// POST /api/trips/:id/dispatch
const dispatch = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query("SELECT * FROM trips WHERE id = $1", [req.params.id]);
    if (!tRes.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Trip not found." }); }
    const trip = tRes.rows[0];

    if (trip.status !== "DRAFT") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Trip cannot be dispatched. Status: ${trip.status}` });
    }

    // Re-validate driver license
    const dRes = await client.query("SELECT license_expiry, status FROM drivers WHERE id = $1", [trip.driver_id]);
    const driver = dRes.rows[0];
    const today = new Date().toISOString().slice(0, 10);
    if (driver.license_expiry && driver.license_expiry.toISOString().slice(0, 10) < today) {
      await client.query("ROLLBACK");
      return res.status(422).json({ success: false, message: "Driver license has expired. Cannot dispatch." });
    }
    if (driver.status === "SUSPENDED") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Driver is suspended." });
    }

    // Re-check vehicle availability
    const vRes = await client.query("SELECT status FROM vehicles WHERE id = $1", [trip.vehicle_id]);
    if (vRes.rows[0].status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Vehicle is no longer available. Status: ${vRes.rows[0].status}` });
    }

    await client.query("UPDATE trips SET status = 'DISPATCHED' WHERE id = $1", [req.params.id]);
    await client.query("UPDATE vehicles SET status = 'ON_TRIP' WHERE id = $1", [trip.vehicle_id]);
    await client.query("UPDATE drivers SET status = 'ON_TRIP' WHERE id = $1", [trip.driver_id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Trip dispatched. Vehicle and driver are now ON_TRIP." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
};

// POST /api/trips/:id/complete
const complete = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query("SELECT * FROM trips WHERE id = $1", [req.params.id]);
    if (!tRes.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Trip not found." }); }
    const trip = tRes.rows[0];

    if (trip.status !== "DISPATCHED") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Trip cannot be completed. Status: ${trip.status}` });
    }

    await client.query("UPDATE trips SET status = 'COMPLETED' WHERE id = $1", [req.params.id]);
    await client.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1", [trip.vehicle_id]);
    await client.query("UPDATE drivers SET status = 'AVAILABLE' WHERE id = $1", [trip.driver_id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Trip completed. Vehicle and driver are now AVAILABLE." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
};

// POST /api/trips/:id/cancel
const cancel = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tRes = await client.query("SELECT * FROM trips WHERE id = $1", [req.params.id]);
    if (!tRes.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Trip not found." }); }
    const trip = tRes.rows[0];

    if (!["DRAFT", "DISPATCHED"].includes(trip.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Cannot cancel trip with status: ${trip.status}` });
    }

    await client.query("UPDATE trips SET status = 'CANCELLED' WHERE id = $1", [req.params.id]);

    if (trip.status === "DISPATCHED") {
      await client.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1", [trip.vehicle_id]);
      await client.query("UPDATE drivers SET status = 'AVAILABLE' WHERE id = $1", [trip.driver_id]);
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Trip cancelled." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
};

module.exports = { getAll, getOne, create, dispatch, complete, cancel };