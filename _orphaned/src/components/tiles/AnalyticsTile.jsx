import React from 'react';
import TileShell from './TileShell';

const MOCK = [
  { label: 'Drafts Created', value: '—' },
  { label: 'Avg Score', value: '—' },
  { label: 'Win Rate', value: '—' },
];

export default function AnalyticsTile() {
  return (
    <TileShell icon="📈" title="Analytics" feature="analytics_advanced" upgradeNote="Pro plan and above">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Track submissions, win rates, and your full funding pipeline.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {MOCK.map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)',
            padding: '10px 8px', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: 'var(--tgm-navy)' }}>{value}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--tgm-muted)', lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>View Analytics</button>
    </TileShell>
  );
}
