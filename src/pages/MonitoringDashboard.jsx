import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';



const s = {
  page: { maxWidth: 1440, margin: '0 auto', padding: '2rem 2.5rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' },
  cardHover: { transition: 'all 0.2s ease', cursor: 'default' },
  h1: { fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', color: '#0f172a', marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  value: { fontSize: 32, fontWeight: 700, color: '#0f172a', marginTop: 8, letterSpacing: '-0.02em' },
  subtext: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  tableHeader: { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' },
  tableCell: { fontSize: 14, color: '#334155', paddingTop: 12, paddingBottom: 12 },
  tableRow: { borderBottom: '1px solid #f8fafc', transition: 'background 0.15s ease' },
  hero: { background: 'linear-gradient(135deg, #f8fafc 0%, #fff 50%, #f0fdf4 100%)', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' },
  severity: { critical: { background: '#fef2f2', color: '#dc2626' }, warning: { background: '#fffbeb', color: '#d97706' }, info: { background: '#f0f9ff', color: '#0284c7' } },
  colors: { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', slate: '#64748b' },
};

function LoadingSkeleton() {
  return (
    <div style={{ ...s.page }}>
      <div style={{ height: 36, width: 280, background: '#f1f5f9', borderRadius: 8, marginBottom: 32 }} />
      <div style={{ ...s.grid4, marginBottom: 32 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ ...s.card, height: 100, background: 'linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    </div>
  );
}

function MetricTile({ label, value, sublabel, trend }) {
  return (
    <div style={{ ...s.card, ...s.cardHover }}>
      <div style={s.label}>{label}</div>
      <div style={s.value}>{value?.toLocaleString() || 0}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={s.subtext}>{sublabel}</div>
        {trend && (
          <span style={{ fontSize: 12, fontWeight: 600, color: trend > 0 ? '#10b981' : '#ef4444' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

function LifetimeTierCountdown({ used, remaining, cap }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const segments = Array.from({ length: 20 }, (_, i) => i < Math.round(pct / 5));
  
  return (
    <div style={s.hero}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lifetime Tier</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Early access spots</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{remaining}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>remaining</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {segments.map((filled, i) => (
          <div key={i} style={{ 
            flex: 1, 
            height: 8, 
            background: filled ? '#10b981' : '#e2e8f0', 
            borderRadius: 4,
            transition: 'background 0.3s ease'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{pct}% filled · {used} of {cap} used</span>
        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Urgency active</span>
      </div>
    </div>
  );
}

function LineChart({ data, dataKey = 'visitors', color = '#3b82f6' }) {
  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;
  
  const maxVal = Math.max(...data.map(d => d[dataKey] || 0), 1);
  const width = 100;
  const height = 60;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d[dataKey] || 0) / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={200} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="#f1f5f9" strokeWidth="1" points={`0,${height} ${width},${height}`} />
      <polyline fill={`url(#gradient-${color})`} stroke="none" points={`0,${height} ${points} ${width},${height}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;
  
  const maxVal = Math.max(...data.map(d => d.count || 0), 1);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 200, paddingTop: 20 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ 
            width: 48, 
            height: `${Math.max(4, ((d.count || 0) / maxVal) * 160)}px`, 
            background: `linear-gradient(180deg, ${colors[i % colors.length]} 0%, ${colors[i % colors.length]}cc 100%)`, 
            borderRadius: 8,
            marginBottom: 12,
            transition: 'height 0.3s ease',
          }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{d.count}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textTransform: 'capitalize' }}>{d.tier}</div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data }) {
  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No AI actions yet</div>;
  
  const total = data.reduce((a, b) => a + (b.count || 0), 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', height: 200 }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          {data.reduce((acc, d, i) => {
            const pct = ((d.count || 0) / total) * 100;
            const startAngle = acc.angle;
            const endAngle = acc.angle + (pct / 100) * 360;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 70 + 60 * Math.cos(startRad);
            const y1 = 70 + 60 * Math.sin(startRad);
            const x2 = 70 + 60 * Math.cos(endRad);
            const y2 = 70 + 60 * Math.sin(endRad);
            const largeArc = pct > 50 ? 1 : 0;
            acc.paths.push(<path key={i} d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} />);
            acc.angle = endAngle;
            return acc;
          }, { paths: [], angle: 0 }).paths}
          <circle cx={70} cy={70} r={35} fill="#fff" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: colors[i % colors.length] }} />
            <span style={{ flex: 1, fontSize: 14, color: '#334155', textTransform: 'capitalize' }}>{d.action}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{d.count}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', width: 40, textAlign: 'right' }}>{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ title, columns, data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ ...s.card }}>
        <div style={s.sectionTitle}>{title}</div>
        <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>No data available</div>
      </div>
    );
  }

  return (
    <div style={{ ...s.card }}>
      <div style={s.sectionTitle}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ ...s.tableHeader, textAlign: i === 0 ? 'left' : 'right' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={s.tableRow}>
              {Object.values(row).map((cell, j) => (
                <td key={j} style={{ ...s.tableCell, textAlign: j === 0 ? 'left' : 'right' }}>
                  {typeof cell === 'string' && cell.startsWith('critical|warning|info') ? (
                    <span style={{ 
                      ...s.severity[cell] || s.severity.info, 
                      padding: '4px 8px', 
                      borderRadius: 6, 
                      fontSize: 12, 
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {cell}
                    </span>
                  ) : cell}
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
  const token = localStorage.getItem('token');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); setDenied(true); return; }
    fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401 || res.status === 403) { setDenied(true); throw new Error('Unauthorized'); }
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(setData)
      .catch(e => { if (!denied) setError(e.message); })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSkeleton />;
  if (denied) return <Navigate to="/dashboard" replace />;
  if (error) return <div style={{ ...s.page, color: '#ef4444', textAlign: 'center', paddingTop: 48 }}>{error}</div>;
  if (!data) return <div style={{ ...s.page, color: '#94a3b8', textAlign: 'center', paddingTop: 48 }}>No data available</div>;

  const subData = (data.subscriptionsByTier || []).map(x => ({ tier: x.tier, count: x._count?.tier || 0 }));
  const aiData = (data.aiUsage || []).map(x => ({ action: x.action, count: x._count?.action || 0 }));

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Founder Monitoring</h1>

      <div style={s.grid4}>
        <MetricTile label="Visitors" value={data.visitors?.last24h} sublabel="Last 24 hours" />
        <MetricTile label="New Signups" value={data.system?.newSignups7d} sublabel="Last 7 days" />
        <MetricTile label="Subscriptions" value={data.system?.activeSubscriptions} sublabel="Active accounts" />
        <MetricTile label="AI Drafts" value={data.system?.aiDraftsToday} sublabel="Generated today" />
      </div>

      <div style={{ ...s.grid2, marginTop: 32 }}>
        <div style={s.card}>
          <div style={s.sectionTitle}>Visitors Trend</div>
          <LineChart data={data.timeseries || []} dataKey="visitors" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.sectionTitle}>Subscriptions by Tier</div>
          <BarChart data={subData} />
        </div>
      </div>

      <div style={{ ...s.grid2, marginTop: 32 }}>
        <LifetimeTierCountdown 
          used={data.system?.lifetimeTierCount || 0} 
          remaining={data.system?.lifetimeTierRemaining || 200}
          cap={data.system?.lifetimeTierCap || 200}
        />
        <div style={s.card}>
          <div style={s.sectionTitle}>AI Usage Breakdown</div>
          <PieChart data={aiData} />
        </div>
      </div>

      <div style={{ ...s.grid2, marginTop: 32 }}>
        <DataTable 
          title="Recent Signups" 
          columns={['Name', 'Email', 'Tier', 'Date']} 
          data={(data.recentSignups || []).map(u => ({
            name: u.name || 'N/A',
            email: u.email,
            tier: u.tier,
            createdAt: new Date(u.createdAt).toLocaleDateString(),
          }))} 
        />
        <DataTable 
          title="Error Logs" 
          columns={['Error', 'Endpoint', 'Severity', 'Time']} 
          data={(data.errors || []).map(e => ({
            message: e.message?.substring(0, 45) + (e.message?.length > 45 ? '...' : ''),
            endpoint: e.endpoint || '-',
            severity: e.severity || 'info',
            createdAt: new Date(e.createdAt).toLocaleDateString(),
          }))} 
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        tr:hover { background: #f8fafc; }
      `}</style>
    </div>
  );
}