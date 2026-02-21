const { query } = require('../db/connection');

const VALID_STATUSES = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

const getAll = async (filters = {}) => {
  let sql = `
    SELECT v.*,
           u.name AS created_by_name,
           COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'COMPLETED') AS total_trips
    FROM vehicles v
    LEFT JOIN users u ON u.id = v.created_by
    LEFT JOIN trips t ON t.vehicle_id = v.id
  `;
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`v.status = $${params.length}`);
  }
  if (filters.vehicle_type) {
    params.push(filters.vehicle_type);
    where.push(`v.vehicle_type = $${params.length}`);
  }
  if (filters.region) {
    params.push(`%${filters.region}%`);
    where.push(`v.region ILIKE $${params.length}`);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY v.id, u.name ORDER BY v.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await query(
    `SELECT v.*,
            u.name AS created_by_name,
            COALESCE(SUM(m.cost),0) AS total_maintenance_cost,
            COALESCE(SUM(f.total_cost),0) AS total_fuel_cost
     FROM vehicles v
     LEFT JOIN users u ON u.id = v.created_by
     LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
     LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
     WHERE v.id = $1
     GROUP BY v.id, u.name`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Vehicle not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const create = async (data, userId) => {
  const {
    name, model, license_plate, vehicle_type,
    max_capacity_kg, odometer_km, acquisition_cost, region,
  } = data;

  const result = await query(
    `INSERT INTO vehicles
       (name, model, license_plate, vehicle_type, max_capacity_kg, odometer_km, acquisition_cost, region, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [name, model, license_plate, vehicle_type || 'VAN',
     max_capacity_kg, odometer_km || 0, acquisition_cost || 0, region, userId]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  // Build dynamic SET clause
  const fields = ['name','model','license_plate','vehicle_type',
                  'max_capacity_kg','odometer_km','acquisition_cost','region'];
  const updates = [];
  const params = [];

  fields.forEach((f) => {
    if (data[f] !== undefined) {
      params.push(data[f]);
      updates.push(`${f} = $${params.length}`);
    }
  });

  if (!updates.length) {
    const err = new Error('No fields to update.');
    err.status = 400;
    throw err;
  }

  params.push(id);
  const result = await query(
    `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Vehicle not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

/**
 * Manual status override (MANAGER only) – cannot override ON_TRIP via this route
 */
const setStatus = async (id, status) => {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Prevent manually setting ON_TRIP; that is done via trip dispatch
  if (status === 'ON_TRIP') {
    const err = new Error('Cannot manually set status to ON_TRIP. Dispatch a trip instead.');
    err.status = 400;
    throw err;
  }

  const result = await query(
    'UPDATE vehicles SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (!result.rows.length) {
    const err = new Error('Vehicle not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const remove = async (id) => {
  const vehicle = await getById(id);
  if (vehicle.status === 'ON_TRIP') {
    const err = new Error('Cannot delete a vehicle that is currently ON_TRIP.');
    err.status = 409;
    throw err;
  }
  await query('DELETE FROM vehicles WHERE id = $1', [id]);
};

module.exports = { getAll, getById, create, update, setStatus, remove };
