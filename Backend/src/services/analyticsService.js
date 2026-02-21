const { query } = require('../db/connection');

/**
 * High-level dashboard KPIs
 */
const getDashboard = async () => {
  const [fleet, drivers, trips, alerts] = await Promise.all([
    // Fleet status counts
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'AVAILABLE')  AS available,
        COUNT(*) FILTER (WHERE status = 'ON_TRIP')    AS on_trip,
        COUNT(*) FILTER (WHERE status = 'IN_SHOP')    AS in_shop,
        COUNT(*) FILTER (WHERE status = 'RETIRED')    AS retired,
        COUNT(*)                                       AS total
      FROM vehicles
    `),
    // Driver status counts
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ON_DUTY')    AS on_duty,
        COUNT(*) FILTER (WHERE status = 'OFF_DUTY')   AS off_duty,
        COUNT(*) FILTER (WHERE status = 'ON_TRIP')    AS on_trip,
        COUNT(*) FILTER (WHERE status = 'SUSPENDED')  AS suspended,
        COUNT(*) FILTER (WHERE license_expiry < CURRENT_DATE) AS expired_licenses
      FROM drivers
    `),
    // Trip stats
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'DISPATCHED') AS active_trips,
        COUNT(*) FILTER (WHERE status = 'DRAFT')      AS pending_trips,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') AS completed_last_30d
      FROM trips
    `),
    // Maintenance alerts
    query(`
      SELECT COUNT(*) AS open_maintenance
      FROM maintenance_logs
      WHERE resolved_at IS NULL
    `),
  ]);

  const fleetData = fleet.rows[0];
  const utilizationRate = fleetData.total > 0
    ? ((parseFloat(fleetData.on_trip) / parseFloat(fleetData.total)) * 100).toFixed(2)
    : '0.00';

  return {
    fleet: { ...fleetData, utilization_rate_pct: parseFloat(utilizationRate) },
    drivers: drivers.rows[0],
    trips: trips.rows[0],
    maintenance: alerts.rows[0],
  };
};

/**
 * Fuel efficiency per vehicle (km/L)
 */
const getFuelEfficiency = async (vehicle_id) => {
  let sql = `
    SELECT
      v.id AS vehicle_id,
      v.name AS vehicle_name,
      v.license_plate,
      ROUND(SUM(f.liters)::NUMERIC, 2)               AS total_liters,
      ROUND(SUM(f.total_cost)::NUMERIC, 2)            AS total_fuel_cost,
      ROUND((v.odometer_km)::NUMERIC, 2)              AS current_odometer_km,
      CASE
        WHEN SUM(f.liters) > 0
        THEN ROUND((
          MAX(f.odometer_at_fill) - MIN(f.odometer_at_fill)
        ) / NULLIF(SUM(f.liters),0), 2)
        ELSE NULL
      END AS fuel_efficiency_km_per_liter
    FROM vehicles v
    LEFT JOIN fuel_logs f ON f.vehicle_id = v.id AND f.odometer_at_fill IS NOT NULL
  `;
  const params = [];
  if (vehicle_id) {
    params.push(vehicle_id);
    sql += ` WHERE v.id = $1`;
  }
  sql += ' GROUP BY v.id, v.name, v.license_plate, v.odometer_km ORDER BY v.name';

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Cost-per-km per vehicle
 */
const getCostPerKm = async (vehicle_id) => {
  let sql = `
    SELECT
      v.id AS vehicle_id,
      v.name AS vehicle_name,
      v.license_plate,
      ROUND(COALESCE(SUM(f.total_cost),0)::NUMERIC, 2) AS total_fuel_cost,
      ROUND(COALESCE(SUM(m.cost),0)::NUMERIC, 2)        AS total_maintenance_cost,
      ROUND((COALESCE(SUM(f.total_cost),0) + COALESCE(SUM(m.cost),0))::NUMERIC, 2) AS total_operational_cost,
      ROUND(COALESCE(SUM(t.distance_km),0)::NUMERIC, 2) AS total_distance_km,
      CASE
        WHEN COALESCE(SUM(t.distance_km),0) > 0
        THEN ROUND((COALESCE(SUM(f.total_cost),0) + COALESCE(SUM(m.cost),0))
                   / SUM(t.distance_km), 4)
        ELSE NULL
      END AS cost_per_km
    FROM vehicles v
    LEFT JOIN fuel_logs f    ON f.vehicle_id = v.id
    LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
    LEFT JOIN trips t        ON t.vehicle_id = v.id AND t.status = 'COMPLETED'
  `;
  const params = [];
  if (vehicle_id) {
    params.push(vehicle_id);
    sql += ` WHERE v.id = $1`;
  }
  sql += ' GROUP BY v.id, v.name, v.license_plate ORDER BY v.name';

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Vehicle ROI = (Revenue proxy via trips) – (Maintenance + Fuel) / Acquisition Cost
 * Note: Since revenue isn't explicitly tracked, we use trip count × avg_revenue_per_trip proxy
 *       or expose raw cost data for Financial Analysts to calculate.
 */
const getVehicleROI = async (vehicle_id) => {
  let sql = `
    SELECT
      v.id AS vehicle_id,
      v.name AS vehicle_name,
      v.license_plate,
      v.acquisition_cost,
      ROUND(COALESCE(SUM(f.total_cost),0)::NUMERIC, 2)  AS total_fuel_cost,
      ROUND(COALESCE(SUM(m.cost),0)::NUMERIC, 2)         AS total_maintenance_cost,
      ROUND((COALESCE(SUM(f.total_cost),0) + COALESCE(SUM(m.cost),0))::NUMERIC, 2) AS total_operational_cost,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'COMPLETED') AS completed_trips,
      ROUND(COALESCE(SUM(t.distance_km),0)::NUMERIC, 2)  AS total_km_driven,
      CASE
        WHEN v.acquisition_cost > 0
        THEN ROUND(
          (COALESCE(SUM(f.total_cost),0) + COALESCE(SUM(m.cost),0)) / v.acquisition_cost * 100,
          2)
        ELSE NULL
      END AS cost_to_acquisition_ratio_pct
    FROM vehicles v
    LEFT JOIN fuel_logs f      ON f.vehicle_id = v.id
    LEFT JOIN maintenance_logs m ON m.vehicle_id = v.id
    LEFT JOIN trips t          ON t.vehicle_id = v.id
  `;
  const params = [];
  if (vehicle_id) {
    params.push(vehicle_id);
    sql += ` WHERE v.id = $1`;
  }
  sql += ' GROUP BY v.id, v.name, v.license_plate, v.acquisition_cost ORDER BY v.name';

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Fleet utilization over time (by month)
 */
const getUtilization = async () => {
  const result = await query(`
    SELECT
      TO_CHAR(dispatched_at, 'YYYY-MM') AS month,
      COUNT(*) AS total_trips,
      COUNT(DISTINCT vehicle_id) AS unique_vehicles_used,
      ROUND(AVG(distance_km)::NUMERIC, 2) AS avg_distance_km,
      ROUND(SUM(cargo_weight_kg)::NUMERIC, 2) AS total_cargo_kg
    FROM trips
    WHERE status = 'COMPLETED' AND dispatched_at IS NOT NULL
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);
  return result.rows;
};

/**
 * Driver performance summary
 */
const getDriverPerformance = async () => {
  const result = await query(`
    SELECT
      d.id,
      d.name,
      d.employee_id,
      d.safety_score,
      d.trips_completed,
      d.license_expiry,
      d.status,
      CASE WHEN d.license_expiry < CURRENT_DATE THEN true ELSE false END AS license_expired,
      ROUND(COALESCE(AVG(t.distance_km),0)::NUMERIC, 2) AS avg_trip_distance_km,
      ROUND(COALESCE(SUM(t.distance_km),0)::NUMERIC, 2) AS total_km_driven
    FROM drivers d
    LEFT JOIN trips t ON t.driver_id = d.id AND t.status = 'COMPLETED'
    GROUP BY d.id, d.name, d.employee_id, d.safety_score, d.trips_completed,
             d.license_expiry, d.status
    ORDER BY d.safety_score DESC
  `);
  return result.rows;
};

/**
 * Monthly financial summary
 */
const getFinancialSummary = async (year) => {
  const targetYear = year || new Date().getFullYear();
  const result = await query(`
    SELECT
      TO_CHAR(date_series, 'YYYY-MM') AS month,
      COALESCE(fuel.total_fuel, 0)        AS total_fuel_cost,
      COALESCE(maint.total_maintenance, 0) AS total_maintenance_cost,
      COALESCE(fuel.total_fuel, 0) + COALESCE(maint.total_maintenance, 0) AS total_operational_cost
    FROM generate_series(
      DATE '${ targetYear }-01-01',
      DATE '${ targetYear }-12-01',
      INTERVAL '1 month'
    ) AS date_series
    LEFT JOIN (
      SELECT DATE_TRUNC('month', fuel_date) AS m, ROUND(SUM(total_cost)::NUMERIC, 2) AS total_fuel
      FROM fuel_logs
      WHERE EXTRACT(YEAR FROM fuel_date) = $1
      GROUP BY m
    ) fuel ON fuel.m = date_series
    LEFT JOIN (
      SELECT DATE_TRUNC('month', service_date) AS m, ROUND(SUM(cost)::NUMERIC, 2) AS total_maintenance
      FROM maintenance_logs
      WHERE EXTRACT(YEAR FROM service_date) = $1
      GROUP BY m
    ) maint ON maint.m = date_series
    ORDER BY month
  `, [targetYear]);
  return result.rows;
};

module.exports = {
  getDashboard,
  getFuelEfficiency,
  getCostPerKm,
  getVehicleROI,
  getUtilization,
  getDriverPerformance,
  getFinancialSummary,
};
