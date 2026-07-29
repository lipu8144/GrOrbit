import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function RequireAdmin({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (user.role !== "superadmin") return <Navigate to="/app" replace />;
  return children;
}
