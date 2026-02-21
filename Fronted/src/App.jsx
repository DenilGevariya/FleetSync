import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import Vehicles    from "./pages/Vehicles";
import Drivers     from "./pages/Drivers";
import Trips       from "./pages/Trips";
import Maintenance from "./pages/Maintenance";
import FuelLogs    from "./pages/FuelLogs";
import Analytics   from "./pages/Analytics";
import Register from "./pages/Register";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/"            element={<Dashboard />} />
                    <Route path="/vehicles"    element={<Vehicles />} />
                    <Route path="/drivers"     element={<Drivers />} />
                    <Route path="/trips"       element={<Trips />} />
                    <Route path="/maintenance" element={<Maintenance />} />
                    <Route path="/fuel"        element={<FuelLogs />} />
                    <Route path="/analytics"   element={<Analytics />} />
                    <Route path="*"            element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}