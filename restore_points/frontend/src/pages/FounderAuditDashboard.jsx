import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

function StatusBadge({ state }) {
  const color = state === true || state === 'enabled' ? '#28a745' : state === false || state === 'disabled' ? '#dc3545' : '#ffc107';
  const label = state === true || state === 'enabled' ? 'PASS' : state === false || state === 'disabled' ? 'FAIL' : 'REVIEW';
  return <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{label}</span>;
}

function MetricCard({ label, value }) {
  return (
    <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, minWidth: 120, textAlign: 'center', margin: 8 }}>
      <div style={{ fontSize: 14, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function AuditCard({ title, status, children }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, margin: '1rem 0', padding: 16, background: '#fafbfc' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ flex: 1, margin: 0 }}>{title}</h3>
        {status !== undefined && <StatusBadge state={status} />}
      </div>
      {children}
    </div>
  );
}

function LogTable({ entries, type }) {
  if (!entries || entries.length === 0) return <div style={{ color: '#888' }}>No {type} logs.</div>;
  return (
    <table style={{ width: '100%', fontSize: 13, marginTop: 8, background: '#fff', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={{ textAlign: 'left', padding: 6 }}>Time</th>
          <th style={{ textAlign: 'left', padding: 6 }}>Message</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i}>
            <td style={{ padding: 6 }}>{e.time || e.timestamp || '-'}</td>
            <td style={{ padding: 6 }}>{e.message || e.event || JSON.stringify(e)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FounderAuditDashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    fetch('/api/founder/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject('Unauthorized'))
      .then(setData)
      .catch(() => setError('Unauthorized or error fetching audit data.'));
  }, [token]);

  if (error) return <div style={{ color: 'red', padding: 32 }}>{error}</div>;
  if (!data) return <div style={{ padding: 32 }}>Loading founder audit...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: 24 }}>
      <h1>Founder Audit Dashboard</h1>
      <AuditCard title="System Overview">
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <MetricCard label="Total Users" value={data.system.totalUsers} />
          <MetricCard label="Active Sessions" value={data.system.activeSessions} />
          <MetricCard label="Total Drafts" value={data.system.totalDrafts} />
          <MetricCard label="Drafts (24h)" value={data.system.draftsLast24h} />
        </div>
      </AuditCard>
      <AuditCard title="Feature Readiness">
        {Object.entries(data.featureReadiness).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            {k}: <StatusBadge state={v} />
          </div>
        ))}
      </AuditCard>
      <AuditCard title="Security Status">
        {Object.entries(data.securityStatus).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            {k}: <StatusBadge state={v} />
          </div>
        ))}
      </AuditCard>
      <AuditCard title="Launch Checklist">
        {Object.entries(data.launchChecklist).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            {k}: <StatusBadge state={v} />
          </div>
        ))}
      </AuditCard>
      <AuditCard title="Error Logs">
        <LogTable entries={data.errors?.slice(0, 20)} type="error" />
      </AuditCard>
      <AuditCard title="Webhook Events">
        <LogTable entries={data.webhookEvents?.slice(0, 20)} type="webhook" />
      </AuditCard>
    </div>
  );
}
