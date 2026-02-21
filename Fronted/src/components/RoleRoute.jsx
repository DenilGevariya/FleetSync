import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RoleRoute({ roles = [], children }) {
  const { user } = useAuth();

  // not logged in
  if (!user) return <Navigate to="/login" replace />;

  // no role restriction → allow
  if (!roles.length) return children;

  // role check
  if (!roles.includes(user.role))
    return <Navigate to="/" replace />;

  return children;
}