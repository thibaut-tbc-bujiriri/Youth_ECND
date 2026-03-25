import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";

// Protection de base uniquement
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return user ? children : <Navigate to="/login" />;
}

// Protection avec rôle spécifique
export function RoleProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) return <Loading />;

  if (!user) return <Navigate to="/login" />;

  if (!role) {
    return <Loading message="Récupération du rôle..." />;
  }

  if (role !== requiredRole) {
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/member/dashboard"} />;
  }

  return children;
}
