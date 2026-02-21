const { query, getClient } = require('../db/connection');

// Generate human-readable trip code
const generateTripCode = async () => {
  const result = await query("SELECT 'TRIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('trip_seq') AS TEXT), 4, '0') AS code");
  return result.rows[0]?.code;
};

// Fallback code generator without sequence
const makeTripCode = () => {
  const d = new Date();
  const date = d.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TRIP-${date}-${rand}`;
};

const getAll = async (filters = {}) => {
  let sql = `
    SELECT t.*,
           v.name AS vehicle_name, v.license_plate, v.max_capacity_kg,
           d.name AS driver_name, d.employee_id,
           u.name AS created_by_name
    FROM trips t
    JOIN vehicles v ON v.id = t.vehicle_id
    JOIN drivers d ON d.id = t.driver_id
    LEFT JOIN users u ON u.id = t.created_by
  `;
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`t.status = $${params.length}`);
  }
  if (filters.vehicle_id) {
    params.push(filters.vehicle_id);
    where.push(`t.vehicle_id = $${params.length}`);
  }
  if (filters.driver_id) {
    params.push(filters.driver_id);
    where.push(`t.driver_id = $${params.length}`);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY t.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await query(
    `SELECT t.*,
            v.name AS vehicle_name, v.license_plate, v.max_capacity_kg, v.vehicle_type,
            d.name AS driver_name, d.employee_id, d.license_category,
            u.name AS created_by_name,
            COALESCE(SUM(f.total_cost),0) AS fuel_cost_on_trip
     FROM trips t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN drivers d ON d.id = t.driver_id
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN fuel_logs f ON f.trip_id = t.id
     WHERE t.id = $1
     GROUP BY t.id, v.name, v.license_plate, v.max_capacity_kg, v.vehicle_type,
              d.name, d.employee_id, d.license_category, u.name`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Trip not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

/**
 * Create a new trip in DRAFT status with full validations
 */
const create = async (data, userId) => {
  const {
    vehicle_id, driver_id, origin, destination,
    cargo_description, cargo_weight_kg, scheduled_at, notes,
  } = data;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // -- Fetch and validate vehicle
    const vRes = await client.query(
      'SELECT id, status, max_capacity_kg FROM vehicles WHERE id = $1 FOR UPDATE',
      [vehicle_id]
    );
    if (!vRes.rows.length) throw Object.assign(new Error('Vehicle not found.'), { status: 404 });
    const vehicle = vRes.rows[0];

    if (vehicle.status !== 'AVAILABLE') {
      throw Object.assign(
        new Error(`Vehicle is not available. Current status: ${vehicle.status}`),
        { status: 409 }
      );
    }

    // -- Capacity check
    if (parseFloat(cargo_weight_kg) > parseFloat(vehicle.max_capacity_kg)) {
      throw Object.assign(
        new Error(
          `Cargo weight (${cargo_weight_kg} kg) exceeds vehicle max capacity (${vehicle.max_capacity_kg} kg).`
        ),
        { status: 422 }
      );
    }

    // -- Fetch and validate driver
    const dRes = await client.query(
      'SELECT id, status, license_expiry, license_category FROM drivers WHERE id = $1 FOR UPDATE',
      [driver_id]
    );
    if (!dRes.rows.length) throw Object.assign(new Error('Driver not found.'), { status: 404 });
    const driver = dRes.rows[0];

    if (driver.status === 'SUSPENDED') {
      throw Object.assign(new Error('Driver is suspended and cannot be assigned.'), { status: 409 });
    }
    if (driver.status === 'ON_TRIP') {
      throw Object.assign(new Error('Driver is already on a trip.'), { status: 409 });
    }

    // -- License expiry check
    const today = new Date().toISOString().slice(0, 10);
    if (driver.license_expiry.toISOString().slice(0, 10) < today) {
      throw Object.assign(
        new Error(`Driver license expired on ${driver.license_expiry.toISOString().slice(0, 10)}. Cannot assign.`),
        { status: 422 }
      );
    }

    const trip_code = makeTripCode();

    const tRes = await client.query(
      `INSERT INTO trips
         (trip_code, vehicle_id, driver_id, origin, destination,
          cargo_description, cargo_weight_kg, scheduled_at, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'DRAFT',$10)
       RETURNING *`,
      [trip_code, vehicle_id, driver_id, origin, destination,
       cargo_description, cargo_weight_kg, scheduled_at, notes, userId]
    );

    await client.query('COMMIT');
    return tRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Dispatch a DRAFT trip → sets vehicle & driver to ON_TRIP
 */
const dispatch = async (tripId, start_odometer, userId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(
      'SELECT * FROM trips WHERE id = $1 FOR UPDATE',
      [tripId]
    );
    if (!tRes.rows.length) throw Object.assign(new Error('Trip not found.'), { status: 404 });
    const trip = tRes.rows[0];

    if (trip.status !== 'DRAFT') {
      throw Object.assign(
        new Error(`Trip cannot be dispatched. Current status: ${trip.status}`),
        { status: 409 }
      );
    }

    // Re-validate vehicle availability
    const vRes = await client.query(
      'SELECT status FROM vehicles WHERE id = $1 FOR UPDATE',
      [trip.vehicle_id]
    );
    if (vRes.rows[0].status !== 'AVAILABLE') {
      throw Object.assign(
        new Error(`Vehicle is no longer available. Status: ${vRes.rows[0].status}`),
        { status: 409 }
      );
    }

    // Re-validate driver
    const dRes = await client.query(
      'SELECT status, license_expiry FROM drivers WHERE id = $1 FOR UPDATE',
      [trip.driver_id]
    );
    const driver = dRes.rows[0];
    const today = new Date().toISOString().slice(0, 10);
    if (driver.license_expiry.toISOString().slice(0, 10) < today) {
      throw Object.assign(new Error('Driver license has expired.'), { status: 422 });
    }
    if (driver.status === 'SUSPENDED' || driver.status === 'ON_TRIP') {
      throw Object.assign(new Error(`Driver status is ${driver.status}.`), { status: 409 });
    }

    // Update trip
    const updatedTrip = await client.query(
      `UPDATE trips
       SET status = 'DISPATCHED', start_odometer = $1, dispatched_at = NOW()
       WHERE id = $2 RETURNING *`,
      [start_odometer, tripId]
    );

    // Update vehicle & driver status
    await client.query(
      "UPDATE vehicles SET status = 'ON_TRIP' WHERE id = $1",
      [trip.vehicle_id]
    );
    await client.query(
      "UPDATE drivers SET status = 'ON_TRIP' WHERE id = $1",
      [trip.driver_id]
    );

    await client.query('COMMIT');
    return updatedTrip.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Complete a DISPATCHED trip → sets vehicle & driver back to AVAILABLE
 */
const complete = async (tripId, end_odometer, notes) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(
      'SELECT * FROM trips WHERE id = $1 FOR UPDATE',
      [tripId]
    );
    if (!tRes.rows.length) throw Object.assign(new Error('Trip not found.'), { status: 404 });
    const trip = tRes.rows[0];

    if (trip.status !== 'DISPATCHED') {
      throw Object.assign(
        new Error(`Trip cannot be completed. Current status: ${trip.status}`),
        { status: 409 }
      );
    }

    if (trip.start_odometer && parseFloat(end_odometer) < parseFloat(trip.start_odometer)) {
      throw Object.assign(
        new Error('End odometer cannot be less than start odometer.'),
        { status: 422 }
      );
    }

    const updatedTrip = await client.query(
      `UPDATE trips
       SET status = 'COMPLETED', end_odometer = $1, completed_at = NOW(),
           notes = COALESCE($2, notes)
       WHERE id = $3 RETURNING *`,
      [end_odometer, notes, tripId]
    );

    // Update vehicle odometer and reset status
    await client.query(
      "UPDATE vehicles SET status = 'AVAILABLE', odometer_km = $1 WHERE id = $2",
      [end_odometer, trip.vehicle_id]
    );

    // Increment driver's trips_completed and reset status
    await client.query(
      `UPDATE drivers
       SET status = 'ON_DUTY', trips_completed = trips_completed + 1
       WHERE id = $1`,
      [trip.driver_id]
    );

    await client.query('COMMIT');
    return updatedTrip.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Cancel a DRAFT or DISPATCHED trip
 */
const cancel = async (tripId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(
      'SELECT * FROM trips WHERE id = $1 FOR UPDATE',
      [tripId]
    );
    if (!tRes.rows.length) throw Object.assign(new Error('Trip not found.'), { status: 404 });
    const trip = tRes.rows[0];

    if (!['DRAFT', 'DISPATCHED'].includes(trip.status)) {
      throw Object.assign(
        new Error(`Trip cannot be cancelled. Current status: ${trip.status}`),
        { status: 409 }
      );
    }

    await client.query(
      "UPDATE trips SET status = 'CANCELLED' WHERE id = $1",
      [tripId]
    );

    // If it was dispatched, release vehicle and driver
    if (trip.status === 'DISPATCHED') {
      await client.query(
        "UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1",
        [trip.vehicle_id]
      );
      await client.query(
        "UPDATE drivers SET status = 'ON_DUTY' WHERE id = $1",
        [trip.driver_id]
      );
    }

    await client.query('COMMIT');
    return { message: 'Trip cancelled successfully.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { getAll, getById, create, dispatch, complete, cancel };
