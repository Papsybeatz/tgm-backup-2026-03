import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';

export default function UsageMeter({ tier = 'starter', onLimitReached }) {
  const { user = null, ...userContextRest } = useUser() ?? {};
  const [draftsUsed, setDraftsUsed] = useState(0);
  const maxDrafts = tier === 'starter' ? 15 : Infinity;
  const limitReached = draftsUsed >= maxDrafts;

  useEffect(() => {
    if (user && user.userId) {
      // Fetch usage from backend
      fetch(`/api/usage/${user.userId}`)
        .then(res => res.json())
        .then(data => setDraftsUsed(data.draftsUsed || 0));
    }
  }, [user && user.userId]);
  if (!user) {
    return <div>Loading user data...</div>;
  }

  useEffect(() => {
    if (limitReached && onLimitReached) onLimitReached();
  }, [limitReached, onLimitReached]);

  return (
    <div style={{ margin: '1rem 0', fontWeight: 'bold' }}>
      {tier === 'starter' && (
        <span>You’ve used {draftsUsed} of 15 drafts this month</span>
      )}
      {limitReached && (
        <span style={{ color: 'red', marginLeft: 8 }}>Limit reached</span>
      )}
    </div>
  );
}
