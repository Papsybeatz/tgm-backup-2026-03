import React from 'react';
import { useUser } from './UserContext';

export default function TierBadge({ tierLabel }) {
  const { user } = useUser();
  // If logged-in lifetime user, show gold badge
  if (user && user.tier === 'lifetime') {
    return (
      <span style={{ background: 'linear-gradient(90deg,#ffd700,#e6b800)', padding: '6px 10px', borderRadius: 6, color: '#111', fontWeight: 600, display: 'inline-block' }}>
        ⭐ Lifetime Member
      </span>
    );
  }

  if (tierLabel) {
    return (
      <span style={{ background: '#007bff', color: '#fff', borderRadius: 4, padding: '0.25rem 0.75rem', fontWeight: 'bold', display: 'inline-block' }}>{tierLabel}</span>
    );
  }

  return null;
}
