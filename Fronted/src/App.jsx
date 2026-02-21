import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

import ProtectedRoute from "./components/RoleRoute";
import RoleRoute from "./components/RoleRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Trips from "./pages/Trips";
import Maintenance from "./pages/Maintenance";
import FuelLogs from "./pages/FuelLogs";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard (all roles) */}
              <Route index element={<Dashboard />} />

              {/* Fleet */}
              <Route
                path="vehicles"
                element={
                  <RoleRoute roles={["MANAGER", "DISPATCHER"]}>
                    <Vehicles />
                  </RoleRoute>
                }
              />

              <Route
                path="drivers"
                element={
                  <RoleRoute roles={["MANAGER", "DISPATCHER"]}>
                    <Drivers />
                  </RoleRoute>
                }
              />

              <Route
                path="trips"
                element={
                  <RoleRoute roles={["MANAGER", "DISPATCHER", "DRIVER"]}>
                    <Trips />
                  </RoleRoute>
                }
              />

              {/* Records */}
              <Route
                path="maintenance"
                element={
                  <RoleRoute roles={["MANAGER", "FINANCE"]}>
                    <Maintenance />
                  </RoleRoute>
                }
              />

              <Route
                path="fuel"
                element={
                  <RoleRoute roles={["MANAGER", "FINANCE"]}>
                    <FuelLogs />
                  </RoleRoute>
                }
              />

              {/* Reports */}
              <Route
                path="analytics"
                element={
                  <RoleRoute roles={["MANAGER"]}>
                    <Analytics />
                  </RoleRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}