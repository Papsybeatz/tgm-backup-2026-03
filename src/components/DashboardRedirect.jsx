import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from './UserContext';

export default function DashboardRedirect() {
  const { user } = useUser() || {};

  if (!user) return <Navigate to="/login" replace />;

  const tier = user.tier || 'free';
  // normalize agency tier names used elsewhere
  const path = tier === 'free' ? '/dashboard/free' : tier === 'agency_starter' ? '/dashboard/agency-starter' : tier === 'agency_unlimited' ? '/dashboard/agency-unlimited' : `/dashboard/${tier}`;
  return <Navigate to={path} replace />;
}
