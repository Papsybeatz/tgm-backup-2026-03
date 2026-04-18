import React from 'react';
import TileShell from './TileShell';

export default function PortfolioTile() {
  return (
    <TileShell icon="📊" title="Portfolio Analytics" feature="analytics_portfolio" upgradeNote="Agency Unlimited only">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Multi-client analytics — track performance across your entire portfolio.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[['Total Clients','—'],['Total Grants','—'],['Pipeline Value','—'],['Win Rate','—']].map(([label, val]) => (
          <div key={label} style={{
            background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)', padding: '10px 12px',
          }}>
            <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: 'var(--tgm-navy)' }}>{val}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-muted)' }}>{label}</p>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>View Portfolio</button>
    </TileShell>
  );
}
