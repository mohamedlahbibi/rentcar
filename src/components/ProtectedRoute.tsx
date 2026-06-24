import { Navigate, useLocation } from "react-router-dom";
import { useAuth, isAdmin, isStaff } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  requireStaff?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireStaff = false, requireAdmin = false }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if ((requireStaff || requireAdmin) && !isStaff(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  if (!requireStaff && !requireAdmin && isStaff(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
