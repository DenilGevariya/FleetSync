import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login:     (d) => api.post("/auth/login", d),
  register:  (d) => api.post("/auth/register", d),
  me:        ()  => api.get("/auth/me"),
  listUsers: ()  => api.get("/auth/users"),
};

// ─── Vehicles ──────────────────────────────────────────────────────────────
// Schema fields: name, plate_number, capacity, status
export const vehiclesAPI = {
  getAll:    (p) => api.get("/vehicles", { params: p }),
  getOne:    (id) => api.get(`/vehicles/${id}`),
  create:    (d) => api.post("/vehicles", d),
  update:    (id, d) => api.put(`/vehicles/${id}`, d),
  setStatus: (id, status) => api.patch(`/vehicles/${id}/status`, { status }),
  delete:    (id) => api.delete(`/vehicles/${id}`),
};

// ─── Drivers ───────────────────────────────────────────────────────────────
// Schema fields: name, license_number, license_expiry, status
export const driversAPI = {
  getAll:    (p) => api.get("/drivers", { params: p }),
  getOne:    (id) => api.get(`/drivers/${id}`),
  create:    (d) => api.post("/drivers", d),
  update:    (id, d) => api.put(`/drivers/${id}`, d),
  setStatus: (id, status) => api.patch(`/drivers/${id}/status`, { status }),
  delete:    (id) => api.delete(`/drivers/${id}`),
};

// ─── Trips ─────────────────────────────────────────────────────────────────
// Schema fields: vehicle_id, driver_id, origin, destination, cargo_weight, status
export const tripsAPI = {
  getAll:    (p) => api.get("/trips", { params: p }),
  getOne:    (id) => api.get(`/trips/${id}`),
  create:    (d) => api.post("/trips", d),
  dispatch:  (id) => api.post(`/trips/${id}/dispatch`),
  complete:  (id) => api.post(`/trips/${id}/complete`),
  cancel:    (id) => api.post(`/trips/${id}/cancel`),
};

// ─── Maintenance ───────────────────────────────────────────────────────────
// Schema fields: vehicle_id, description, cost
export const maintenanceAPI = {
  getAll:         (p) => api.get("/maintenance", { params: p }),
  create:         (d) => api.post("/maintenance", d),
  delete:         (id) => api.delete(`/maintenance/${id}`),
  releaseVehicle: (vehicle_id) => api.post(`/maintenance/release/${vehicle_id}`),
};

// ─── Fuel ──────────────────────────────────────────────────────────────────
// Schema fields: vehicle_id, liters, cost
export const fuelAPI = {
  getAll:  (p) => api.get("/fuel", { params: p }),
  create:  (d) => api.post("/fuel", d),
  delete:  (id) => api.delete(`/fuel/${id}`),
};

// ─── Analytics ─────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard:           () => api.get("/analytics/dashboard"),
  fuelSummary:         () => api.get("/analytics/fuel-summary"),
  maintenanceSummary:  () => api.get("/analytics/maintenance-summary"),
  tripStats:           () => api.get("/analytics/trip-stats"),
  monthlyCosts:        (y) => api.get("/analytics/monthly-costs", { params: { year: y } }),
};

export default api;