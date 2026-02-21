const { query } = require('../db/connection');

const getAll = async (filters = {}) => {
  let sql = `
    SELECT f.*,
           v.name AS vehicle_name, v.license_plate,
           t.trip_code,
           u.name AS logged_by_name
    FROM fuel_logs f
    JOIN vehicles v ON v.id = f.vehicle_id
    LEFT JOIN trips t ON t.id = f.trip_id
    LEFT JOIN users u ON u.id = f.logged_by
  `;
  const params = [];
  const where = [];

  if (filters.vehicle_id) {
    params.push(filters.vehicle_id);
    where.push(`f.vehicle_id = $${params.length}`);
  }
  if (filters.trip_id) {
    params.push(filters.trip_id);
    where.push(`f.trip_id = $${params.length}`);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY f.fuel_date DESC, f.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await query(
    `SELECT f.*, v.name AS vehicle_name, v.license_plate,
            t.trip_code, u.name AS logged_by_name
     FROM fuel_logs f
     JOIN vehicles v ON v.id = f.vehicle_id
     LEFT JOIN trips t ON t.id = f.trip_id
     LEFT JOIN users u ON u.id = f.logged_by
     WHERE f.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Fuel log not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const create = async (data, userId) => {
  const { vehicle_id, trip_id, liters, cost_per_liter, odometer_at_fill, fuel_date, station } = data;

  // Verify vehicle exists
  const vRes = await query('SELECT id FROM vehicles WHERE id = $1', [vehicle_id]);
  if (!vRes.rows.length) {
    const err = new Error('Vehicle not found.');
    err.status = 404;
    throw err;
  }

  // Verify trip belongs to vehicle if provided
  if (trip_id) {
    const tRes = await query(
      'SELECT id FROM trips WHERE id = $1 AND vehicle_id = $2',
      [trip_id, vehicle_id]
    );
    if (!tRes.rows.length) {
      const err = new Error('Trip not found or does not belong to this vehicle.');
      err.status = 400;
      throw err;
    }
  }

  const result = await query(
    `INSERT INTO fuel_logs
       (vehicle_id, trip_id, liters, cost_per_liter, odometer_at_fill, fuel_date, station, logged_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [vehicle_id, trip_id || null, liters, cost_per_liter,
     odometer_at_fill, fuel_date || new Date().toISOString().slice(0, 10), station, userId]
  );
  return result.rows[0];
};

const remove = async (id) => {
  const result = await query('DELETE FROM fuel_logs WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) {
    const err = new Error('Fuel log not found.');
    err.status = 404;
    throw err;
  }
};

module.exports = { getAll, getById, create, remove };
