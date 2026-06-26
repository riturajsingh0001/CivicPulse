import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../AuthContext';

export function PrivateRoute({ children, roleRequired }: { children: React.ReactNode, roleRequired?: UserRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-cyan-400">Loading Session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roleRequired && profile?.role && profile.role !== roleRequired) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
