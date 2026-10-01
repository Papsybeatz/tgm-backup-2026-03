import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from './UserContext';

// Kept for backward-compat with any old links to /dashboard/free etc.
// All tier routing is now handled by UnifiedDashboard.
export default function DashboardRedirect() {
  const { user } = useUser() || {};
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}
