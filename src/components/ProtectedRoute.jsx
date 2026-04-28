import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import { hasFeature } from '../config/tiers';

/**
 * RequireAuth — redirects unauthenticated users to /login.
 * Preserves the intended destination so login can redirect back.
 */
export function RequireAuth({ children }) {
  const { user } = useUser();
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

/**
 * RequireOnboarding — after signup, ensures user completes onboarding
 * before reaching the dashboard or workspace.
 */
export function RequireOnboarding({ children }) {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const onboarded = localStorage.getItem('tgm_onboarded');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

/**
 * ProtectedRoute — checks tier feature access.
 * Assumes user is already authenticated (wrap with RequireAuth first).
 */
export function ProtectedRoute({ feature, children }) {
  const { user } = useUser();
  const tier = user?.tier || 'free';

  if (!hasFeature(tier, feature)) {
    return <Navigate to="/upgrade" replace />;
  }

  return children;
}

/**
 * TierRoute — restricts to specific tiers.
 */
export function TierRoute({ allowedTiers, children }) {
  const { user } = useUser();
  const tier = user?.tier || 'free';

  if (!allowedTiers.includes(tier)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
