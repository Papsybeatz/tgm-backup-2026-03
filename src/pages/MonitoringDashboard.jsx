import React, { useEffect, useState, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const ADMIN_EMAIL = 'Clotteythomas41@gmail.com';

function MetricTile({ label, value, sublabel }) {
  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 8, 
      padding: 20, 
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>{value}</div>
      {sublabel && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

function LifetimeTierCountdown({ used, remaining, cap }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
      borderRadius: 8, 
      padding: 24, 
      color: '#fff',
      boxShadow: '0 4px 12px rgba(26,26,46,0.3)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Lifetime Tier</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{used}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Used</div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.5 }}>/</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{cap}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Cap</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#4ade80', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
          {remaining} remaining — {pct}% filled
        </div>
      </div>
    </div>
  );
}

function SimpleLineChart({ data, dataKey = 'visitors', color = '#2563eb' }) {
  const maxVal = Math.max(...data.map(d => d[dataKey]), 1);
  const width = 100;
  const height = 40;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d[dataKey] / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="100%" height={60} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        points={points} 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SimpleBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 100, padding: '0 8px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div 
            style={{ 
              width: '100%', 
              height: `${(d.count / maxVal) * 80}px`, 
              background: '#10b981', 
              borderRadius: 4,
              minHeight: 4,
            }} 
          />
          <div style={{ fontSize: 10, marginTop: 4, color: '#666' }}>{d.tier}</div>
          <div style={{ fontSize: 11, fontWeight: 600 }}>{d.count}</div>
        </div>
      ))}
    </div>
  );
}

function SimplePieChart({ data }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  if (total === 0) return <div style={{ color: '#999', textAlign: 'center' }}>No data</div>;
  
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];
  let currentAngle = 0;
  
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      {data.map((d, i) => {
        const pct = Math.round((d.count / total) * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: colors[i % colors.length] }} />
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{d.action}</span>
              <span style={{ color: '#666' }}> ({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ title, columns, data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</div>
        <div style={{ color: '#999', fontSize: 13 }}>No data</div>
      </div>
    );
  }
  
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            {columns.map((col, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: 500 }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
              {columns.map((col, j) => (
                <td key={j} style={{ padding: '10px 0', color: '#333' }}>
                  {row[columns[j].toLowerCase().replace(/[^a-z]/g, '') === 'date' ? 'createdAt' : 
                    col.toLowerCase().replace(/[^a-z]/g, '') === 'tier' ? 'tier' :
                    col.toLowerCase().replace(/[^a-z]/g, '') === 'error' ? 'message' :
                    col.toLowerCase().replace(/[^a-z]/g, '') === 'endpoint' ? 'endpoint' :
                    col.toLowerCase().replace(/[^a-z]/g, '') === 'severity' ? 'severity' :
                    col.toLowerCase().replace(/[^a-z]/g, '') === 'time' ? 'createdAt' :
                    Object.keys(row)[j]] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MonitoringDashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch('/api/admin/metrics', { 
      headers: { Authorization: `Bearer ${token}` } 
    })
    .then(res => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    })
    .then(setData)
    .catch(() => setError('Unauthorized or error fetching metrics'))
    .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#666' }}>
        Loading monitoring dashboard...
      </div>
    );
  }

  if (!token || user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  if (error) {
    return (
      <div style={{ padding: 48, color: '#dc3545', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 48, color: '#666', textAlign: 'center' }}>
        No data available
      </div>
    );
  }

  const subData = data.subscriptionsByTier || [];
  const aiData = data.aiUsage || [];
  const recentData = data.recentSignups || [];
  const errorsData = data.errors || [];
  const timeseriesData = data.timeseries || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#1a1a2e' }}>
        Founder Monitoring Dashboard
      </h1>
      
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricTile 
          label="Visitors (24h)" 
          value={data.visitors?.last24h || 0} 
          sublabel="Plausible analytics"
        />
        <MetricTile 
          label="New Signups (7d)" 
          value={data.system?.newSignups7d || 0} 
          sublabel="from DB"
        />
        <MetricTile 
          label="Active Subscriptions" 
          value={data.system?.activeSubscriptions || 0} 
          sublabel="paid users"
        />
        <MetricTile 
          label="AI Drafts Today" 
          value={data.system?.aiDraftsToday || 0} 
          sublabel="from logs"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Visitors (30 days)</div>
          <SimpleLineChart data={timeseriesData} dataKey="visitors" color="#2563eb" />
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Subscriptions by Tier</div>
          <SimpleBarChart data={subData.map(x => ({ tier: x.tier, count: x._count?.tier || 0 }))} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <LifetimeTierCountdown 
          used={data.system?.lifetimeTierCount || 0} 
          remaining={data.system?.lifetimeTierRemaining || 200}
          cap={data.system?.lifetimeTierCap || 200}
        />
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>AI Usage</div>
          <SimplePieChart data={aiData.map(x => ({ action: x.action, count: x._count?.action || 0 }))} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <DataTable 
          title="Recent Signups" 
          columns={['Name', 'Email', 'Tier', 'Date']} 
          data={recentData.map(u => ({
            name: u.name || 'N/A',
            email: u.email,
            tier: u.tier,
            createdAt: new Date(u.createdAt).toLocaleDateString(),
          }))} 
        />
        <DataTable 
          title="Error Logs" 
          columns={['Error', 'Endpoint', 'Severity', 'Time']} 
          data={errorsData.map(e => ({
            message: e.message?.substring(0, 50) + (e.message?.length > 50 ? '...' : ''),
            endpoint: e.endpoint || '-',
            severity: e.severity || 'info',
            createdAt: new Date(e.createdAt).toLocaleString(),
          }))} 
        />
      </div>
    </div>
  );
}