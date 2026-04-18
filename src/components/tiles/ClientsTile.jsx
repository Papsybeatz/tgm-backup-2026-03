import React from 'react';
import TileShell from './TileShell';

export default function ClientsTile() {
  return (
    <TileShell icon="🏢" title="Client Folders" feature="client_folders" upgradeNote="Agency plan and above">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Manage separate workspaces for each of your clients.
      </p>
      <div style={{
        background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)',
        padding: '12px 16px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--tgm-muted)', fontWeight: 600 }}>ACTIVE CLIENTS</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tgm-navy)' }}>0</span>
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>Manage Clients</button>
    </TileShell>
  );
}
