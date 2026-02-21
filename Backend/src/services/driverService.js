const { query } = require('../db/connection');

const VALID_STATUSES = ['ON_DUTY', 'OFF_DUTY', 'ON_TRIP', 'SUSPENDED'];

const getAll = async (filters = {}) => {
  let sql = `
    SELECT d.*,
           u.name AS created_by_name,
           CASE WHEN d.license_expiry < CURRENT_DATE THEN true ELSE false END AS license_expired
    FROM drivers d
    LEFT JOIN users u ON u.id = d.created_by
  `;
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`d.status = $${params.length}`);
  }
  if (filters.license_category) {
    params.push(filters.license_category);
    where.push(`d.license_category = $${params.length}`);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY d.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await query(
    `SELECT d.*,
            u.name AS created_by_name,
            CASE WHEN d.license_expiry < CURRENT_DATE THEN true ELSE false END AS license_expired
     FROM drivers d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE d.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const create = async (data, userId) => {
  const {
    name, employee_id, phone, email, license_number,
    license_category, license_expiry, safety_score,
  } = data;

  const result = await query(
    `INSERT INTO drivers
       (name, employee_id, phone, email, license_number, license_category, license_expiry, safety_score, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [name, employee_id, phone, email, license_number,
     license_category.toUpperCase(), license_expiry, safety_score ?? 100, userId]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const fields = ['name','employee_id','phone','email','license_number',
                  'license_category','license_expiry','safety_score'];
  const updates = [];
  const params = [];

  fields.forEach((f) => {
    if (data[f] !== undefined) {
      params.push(f === 'license_category' ? data[f].toUpperCase() : data[f]);
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
    `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

/**
 * Set driver status – enforces business rules
 */
const setStatus = async (id, status) => {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (status === 'ON_TRIP') {
    const err = new Error('Cannot manually set driver status to ON_TRIP. Dispatch a trip instead.');
    err.status = 400;
    throw err;
  }

  const result = await query(
    'UPDATE drivers SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const remove = async (id) => {
  const driver = await getById(id);
  if (driver.status === 'ON_TRIP') {
    const err = new Error('Cannot delete a driver who is currently ON_TRIP.');
    err.status = 409;
    throw err;
  }
  await query('DELETE FROM drivers WHERE id = $1', [id]);
};

module.exports = { getAll, getById, create, update, setStatus, remove };
