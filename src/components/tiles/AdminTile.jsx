import React from 'react';
import TileShell from './TileShell';

const ACTIONS = ['User Management', 'Workspace Settings', 'Billing & Invoices', 'Audit Logs'];

export default function AdminTile() {
  return (
    <TileShell icon="⚙️" title="Admin Controls" feature="admin_controls" upgradeNote="Agency Unlimited only">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Full control over users, workspaces, billing, and audit logs.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {ACTIONS.map(action => (
          <div key={action} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)', padding: '9px 14px',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 13, color: 'var(--tgm-text)', fontWeight: 500 }}>{action}</span>
            <span style={{ color: 'var(--tgm-muted)', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>Open Admin Panel</button>
    </TileShell>
  );
}
