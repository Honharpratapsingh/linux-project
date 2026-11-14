import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../../types/api';
import { LoadingState } from '../../components/common/LoadingState';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Checking authentication..." fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Verifying permissions..." fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Loading..." fullScreen />;
  }

  if (user) {
    const from = (location.state as any)?.from?.pathname || '/overview';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
