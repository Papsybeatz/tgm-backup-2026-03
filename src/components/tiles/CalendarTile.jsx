import React from 'react';
import TileShell from './TileShell';

const UPCOMING = [
  { name: 'NEA Community Grant', due: 'May 15' },
  { name: 'HUD Housing Initiative', due: 'Jun 1' },
  { name: 'USDA Rural Dev Fund', due: 'Jun 30' },
];

export default function CalendarTile() {
  return (
    <TileShell icon="📅" title="Grant Calendar" feature="grant_calendar" upgradeNote="Pro plan and above">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Track deadlines and never miss a funding opportunity.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {UPCOMING.map(({ name, due }) => (
          <div key={name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)', padding: '10px 14px',
          }}>
            <span style={{ fontSize: 13, color: 'var(--tgm-text)', fontWeight: 500 }}>{name}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--tgm-navy)',
              background: 'rgba(212,175,55,.15)', padding: '2px 8px', borderRadius: 20,
            }}>{due}</span>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>Open Calendar</button>
    </TileShell>
  );
}
