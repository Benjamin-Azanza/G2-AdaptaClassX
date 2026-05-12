import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';
import type { UserRole } from '../../types/auth';
import { routePaths } from './routePaths';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: UserRole;
}

function getDashboardByRole(role: UserRole) {
  return role === 'TEACHER'
    ? routePaths.teacherDashboard
    : routePaths.studentDashboard;
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to={routePaths.login} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={getDashboardByRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export function AuthRedirect({ children }: { children: ReactNode }) {
  const { user, token } = useAuthStore();

  if (token && user) {
    return <Navigate to={getDashboardByRole(user.role)} replace />;
  }

  return <>{children}</>;
}
