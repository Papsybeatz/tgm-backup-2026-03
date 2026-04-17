import React from 'react';
import { useUser } from './UserContext';
import './StarterDashboard.css';

export default function AgencyUnlimitedDashboard() {
  const userContext = useUser();
  const user = userContext && userContext.user ? userContext.user : null;

  if (!user) {
    return <div>Loading user data...</div>;
  }
  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agency Unlimited Dashboard</h1>
        <span className={styles.tierBadge}>Tier: Agency Unlimited</span>
      </div>
      <div className={styles.featureBox}>
        <h3>Agency Unlimited Features</h3>
        <ul>
          <li>✅ Unlimited seats</li>
          <li>✅ Unlimited workspaces</li>
          <li>✅ Unlimited drafts</li>
          <li>✅ Full white-label</li>
          <li>✅ Advanced analytics</li>
          <li>✅ Priority support + onboarding</li>
        </ul>
      </div>
      <button
        style={{
          padding: '1rem',
          backgroundColor: '#ff9800',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem',
          width: '100%'
        }}
      >
        Add Team Member
      </button>
    </div>
  );
}
