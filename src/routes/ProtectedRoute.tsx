import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-ink/50">Загрузка...</div>;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
