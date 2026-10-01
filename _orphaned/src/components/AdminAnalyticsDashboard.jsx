// AdminAnalyticsDashboard.jsx
// Analytics dashboard for admin users
import React, { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../core/Analytics';

export default function AdminAnalyticsDashboard({ visible, onClose, user = { userId: 'admin', tier: 'admin' } }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (visible) {
      // In production, fetch from backend
      setData(getAdminAnalytics());
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <div className="adminAnalyticsDashboard" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 600, margin: '2rem auto', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Analytics Dashboard</h2>
        <button onClick={onClose}>Close</button>
      </div>
      {!data ? <div>Loading…</div> : (
        <>
          <div><b>Total users:</b> {data.totalUsers}</div>
          <div><b>Active users:</b> Daily: {data.activeUsers.daily}, Weekly: {data.activeUsers.weekly}, Monthly: {data.activeUsers.monthly}</div>
          <div><b>Conversion rate (free → paid):</b> {data.conversionRate * 100}%</div>
          <div><b>Most used agents:</b> {data.mostUsedAgents.join(', ')}</div>
          <div><b>Most abandoned workflows:</b> {data.mostAbandonedWorkflows.join(', ')}</div>
          <div><b>Beta invite acceptance rate:</b> {data.betaInviteAcceptance * 100}%</div>
          <div><b>Tier distribution:</b> {Object.entries(data.tierDistribution).map(([tier, count]) => `${tier}: ${count}`).join(', ')}</div>
        </>
      )}
    </div>
  );
}
