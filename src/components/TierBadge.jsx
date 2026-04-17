import React from 'react';
import { useUser } from './UserContext';

export default function TierBadge({ tierLabel }) {
  const { user } = useUser();

  if (user?.tier === 'lifetime') {
    return (
      <span className="tier-badge" style={{ background: 'linear-gradient(90deg,#ffd700,#e6b800)', color: '#111' }}>
        ⭐ Lifetime Member
      </span>
    );
  }

  if (tierLabel) {
    return (
      <span className="tier-badge badge-primary">{tierLabel}</span>
    );
  }

  return null;
}
