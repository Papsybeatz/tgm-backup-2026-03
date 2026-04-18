import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { getTierLimits } from '../../config/tiers';
import TileShell from './TileShell';

export default function DraftTile() {
  const navigate = useNavigate();
  const { user } = useUser() || {};
  const limits = getTierLimits(user?.tier || 'free');
  const draftsLimit = limits.drafts === Infinity ? 'Unlimited' : limits.drafts;

  return (
    <TileShell icon="✍️" title="Draft Generator" feature={null}>
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Create AI-powered, funder-ready grant proposals in minutes.
      </p>
      <div style={{
        background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)',
        padding: '12px 16px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--tgm-muted)', fontWeight: 600 }}>DRAFTS AVAILABLE</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tgm-navy)' }}>{draftsLimit}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        <button onClick={() => navigate('/workspace/new-draft')} style={{
          flex: 1, padding: '10px', borderRadius: 'var(--tgm-radius-md)',
          background: 'var(--tgm-gold)', border: 'none',
          color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>+ New Draft</button>
        <button onClick={() => navigate('/workspace/new-draft')} style={{
          flex: 1, padding: '10px', borderRadius: 'var(--tgm-radius-md)',
          background: 'transparent', border: '1.5px solid var(--tgm-border)',
          color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>View All</button>
      </div>
    </TileShell>
  );
}
