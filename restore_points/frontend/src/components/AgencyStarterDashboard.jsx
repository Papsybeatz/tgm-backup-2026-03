import React from 'react';
import { useUser } from './UserContext';
import './StarterDashboard.css';

export default function AgencyStarterDashboard() {
  const userContext = useUser();
  const user = userContext && userContext.user ? userContext.user : null;
  // For demo, use dummy values
  const teamCount = user && user.seats ? user.seats : 1;
  const workspaceCount = user && user.maxWorkspaces ? user.maxWorkspaces : 1;

  if (!user) {
    return <div>Loading user data...</div>;
  }
  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agency Starter Dashboard</h1>
        <span className={styles.tierBadge}>Tier: Agency Starter</span>
      </div>
      <div className={styles.featureBox}>
        <h3>Agency Starter Features</h3>
        <ul>
          <li>✅ Seat usage: {teamCount} / 10</li>
          <li>✅ Workspace usage: {workspaceCount} / 5</li>
          <li>✅ Unlimited drafts</li>
          <li>✅ White-label tools</li>
          <li>✅ Analytics dashboard</li>
        </ul>
      </div>
      <button
        style={{
          padding: '1rem',
          backgroundColor: '#007bff',
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
