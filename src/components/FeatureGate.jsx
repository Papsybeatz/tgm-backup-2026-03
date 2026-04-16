import React from 'react';
import { hasFeature } from '../config/tiers';
import { useUser } from './UserContext';

export function FeatureGate({ feature, children, fallback = null }) {
  const userContext = useUser();
  const user = userContext?.user;
  const tier = user?.tier || 'free';

  if (!hasFeature(tier, feature)) {
    return fallback;
  }

  return children;
}

export function FeatureGateWithUpgrade({ feature, children }) {
  const userContext = useUser();
  const user = userContext?.user;
  const tier = user?.tier || 'free';

  if (!hasFeature(tier, feature)) {
    return (
      <div className="gated-feature-placeholder">
        <div className="card" style={{ opacity: 0.7, textAlign: 'center', padding: 'var(--space-lg)' }}>
          <span style={{ fontSize: '24px', marginBottom: 'var(--space-sm)', display: 'block' }}>🔒</span>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
            Upgrade to unlock this feature
          </p>
          <a href="/pricing" className="btn btn-primary">
            View Plans
          </a>
        </div>
      </div>
    );
  }

  return children;
}

export default FeatureGate;
