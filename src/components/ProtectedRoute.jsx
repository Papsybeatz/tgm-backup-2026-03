import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasFeature } from '../config/tiers';
import { useUser } from './UserContext';

export function ProtectedRoute({ feature, children }) {
  const userContext = useUser();
  const user = userContext?.user;
  const tier = user?.tier || 'free';

  if (!hasFeature(tier, feature)) {
    return <Navigate to="/upgrade" replace />;
  }

  return children;
}

export function TierRoute({ allowedTiers, children }) {
  const userContext = useUser();
  const user = userContext?.user;
  const tier = user?.tier || 'free';

  if (!allowedTiers.includes(tier)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
