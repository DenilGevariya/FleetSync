const { query, getClient } = require('../db/connection');

const getAll = async (filters = {}) => {
  let sql = `
    SELECT m.*,
           v.name AS vehicle_name, v.license_plate,
           u.name AS logged_by_name
    FROM maintenance_logs m
    JOIN vehicles v ON v.id = m.vehicle_id
    LEFT JOIN users u ON u.id = m.logged_by
  `;
  const params = [];
  const where = [];

  if (filters.vehicle_id) {
    params.push(filters.vehicle_id);
    where.push(`m.vehicle_id = $${params.length}`);
  }
  if (filters.resolved === 'false' || filters.resolved === false) {
    where.push('m.resolved_at IS NULL');
  } else if (filters.resolved === 'true' || filters.resolved === true) {
    where.push('m.resolved_at IS NOT NULL');
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY m.service_date DESC, m.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (id) => {
  const result = await query(
    `SELECT m.*, v.name AS vehicle_name, v.license_plate, v.status AS vehicle_status,
            u.name AS logged_by_name
     FROM maintenance_logs m
     JOIN vehicles v ON v.id = m.vehicle_id
     LEFT JOIN users u ON u.id = m.logged_by
     WHERE m.id = $1`,
    [id]
  );
  if (!result.rows.length) {
    const err = new Error('Maintenance log not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

/**
 * Create maintenance log → automatically sets vehicle status to IN_SHOP
 */
const create = async (data, userId) => {
  const {
    vehicle_id, service_type, description, cost,
    service_date, vendor, odometer_at_service,
  } = data;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify vehicle exists
    const vRes = await client.query(
      'SELECT id, status FROM vehicles WHERE id = $1 FOR UPDATE',
      [vehicle_id]
    );
    if (!vRes.rows.length) throw Object.assign(new Error('Vehicle not found.'), { status: 404 });

    if (vRes.rows[0].status === 'ON_TRIP') {
      throw Object.assign(
        new Error('Cannot log maintenance for a vehicle that is currently ON_TRIP.'),
        { status: 409 }
      );
    }

    // Insert maintenance log
    const mRes = await client.query(
      `INSERT INTO maintenance_logs
         (vehicle_id, service_type, description, cost, service_date, vendor, odometer_at_service, logged_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [vehicle_id, service_type, description, cost || 0,
       service_date || new Date().toISOString().slice(0, 10),
       vendor, odometer_at_service, userId]
    );

    // ⚡ AUTO-LOGIC: Set vehicle status to IN_SHOP
    await client.query(
      "UPDATE vehicles SET status = 'IN_SHOP' WHERE id = $1",
      [vehicle_id]
    );

    await client.query('COMMIT');
    return mRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Resolve a maintenance entry → sets vehicle back to AVAILABLE
 */
const resolve = async (id, userId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const mRes = await client.query(
      'SELECT * FROM maintenance_logs WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!mRes.rows.length) throw Object.assign(new Error('Maintenance log not found.'), { status: 404 });
    const log = mRes.rows[0];

    if (log.resolved_at) {
      throw Object.assign(new Error('Maintenance log is already resolved.'), { status: 409 });
    }

    // Check if vehicle still has other open maintenance logs
    const openLogs = await client.query(
      `SELECT COUNT(*) AS cnt FROM maintenance_logs
       WHERE vehicle_id = $1 AND id != $2 AND resolved_at IS NULL`,
      [log.vehicle_id, id]
    );

    await client.query(
      'UPDATE maintenance_logs SET resolved_at = NOW() WHERE id = $1',
      [id]
    );

    // Only release vehicle if no other open maintenance logs remain
    if (parseInt(openLogs.rows[0].cnt) === 0) {
      await client.query(
        "UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1",
        [log.vehicle_id]
      );
    }

    await client.query('COMMIT');
    return { message: 'Maintenance resolved. Vehicle released if no pending services.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const update = async (id, data) => {
  const fields = ['service_type','description','cost','service_date','vendor','odometer_at_service'];
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
    `UPDATE maintenance_logs SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Maintenance log not found.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

module.exports = { getAll, getById, create, resolve, update };
