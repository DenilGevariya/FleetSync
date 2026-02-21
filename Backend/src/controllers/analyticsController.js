const pool = require("../db/connection");

// GET /api/analytics/dashboard
const dashboard = async (req, res, next) => {
  try {
    const [fleet, drivers, trips, maintenance] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
          COUNT(*) FILTER (WHERE status = 'ON_TRIP')   AS on_trip,
          COUNT(*) FILTER (WHERE status = 'IN_SHOP')   AS in_shop,
          COUNT(*) FILTER (WHERE status = 'RETIRED')   AS retired,
          COUNT(*)                                      AS total
        FROM vehicles
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')                       AS available,
          COUNT(*) FILTER (WHERE status = 'ON_TRIP')                         AS on_trip,
          COUNT(*) FILTER (WHERE status = 'SUSPENDED')                       AS suspended,
          COUNT(*) FILTER (WHERE license_expiry < CURRENT_DATE)              AS expired_licenses,
          COUNT(*)                                                            AS total
        FROM drivers
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'DRAFT')      AS draft,
          COUNT(*) FILTER (WHERE status = 'DISPATCHED') AS dispatched,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')  AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')  AS cancelled
        FROM trips
      `),
      pool.query(`
        SELECT
          COUNT(*)            AS total_logs,
          COALESCE(SUM(cost), 0) AS total_cost
        FROM maintenance_logs
      `),
    ]);

    const f = fleet.rows[0];
    const utilization = f.total > 0
      ? ((parseInt(f.on_trip) / parseInt(f.total)) * 100).toFixed(1)
      : "0.0";

    res.json({
      success: true,
      data: {
        fleet: { ...f, utilization_rate: parseFloat(utilization) },
        drivers: drivers.rows[0],
        trips: trips.rows[0],
        maintenance: maintenance.rows[0],
      }
    });
  } catch (err) { next(err); }
};

// GET /api/analytics/fuel-summary
const fuelSummary = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.plate_number,
        v.capacity,
        COALESCE(SUM(f.liters), 0) AS total_liters,
        COALESCE(SUM(f.cost), 0)   AS total_fuel_cost,
        COUNT(f.id)                AS fill_count
      FROM vehicles v
      LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
      GROUP BY v.id, v.name, v.plate_number, v.capacity
      ORDER BY total_fuel_cost DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/analytics/maintenance-summary
const maintenanceSummary = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.plate_number,
        COALESCE(SUM(m.cost), 0)  AS total_maintenance_cost,
        COUNT(m.id)               AS service_count
      FROM vehicles v
      LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
      GROUP BY v.id, v.name, v.plate_number
      ORDER BY total_maintenance_cost DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/analytics/trip-stats
const tripStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.plate_number,
        v.capacity,
        COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') AS completed_trips,
        COUNT(t.id) FILTER (WHERE t.status = 'CANCELLED') AS cancelled_trips,
        COALESCE(SUM(t.cargo_weight) FILTER (WHERE t.status = 'COMPLETED'), 0) AS total_cargo_kg
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
      GROUP BY v.id, v.name, v.plate_number, v.capacity
      ORDER BY completed_trips DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/analytics/monthly-costs
const monthlyCosts = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await pool.query(`
      SELECT
        TO_CHAR(gs.m, 'Mon') AS month,
        TO_CHAR(gs.m, 'MM')  AS month_num,
        COALESCE(f.fuel_cost, 0)        AS fuel_cost,
        COALESCE(m.maintenance_cost, 0) AS maintenance_cost,
        COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0) AS total_cost
      FROM generate_series(
        DATE '${year}-01-01', DATE '${year}-12-01', INTERVAL '1 month'
      ) AS gs(m)
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) AS mo, SUM(cost) AS fuel_cost
        FROM fuel_logs WHERE EXTRACT(YEAR FROM created_at) = $1 GROUP BY mo
      ) f ON f.mo = gs.m
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) AS mo, SUM(cost) AS maintenance_cost
        FROM maintenance_logs WHERE EXTRACT(YEAR FROM created_at) = $1 GROUP BY mo
      ) m ON m.mo = gs.m
      ORDER BY gs.m
    `, [year]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { dashboard, fuelSummary, maintenanceSummary, tripStats, monthlyCosts };