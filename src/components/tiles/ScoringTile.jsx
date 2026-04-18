import React from 'react';
import { useUser } from '../UserContext';
import { getTierLimits } from '../../config/tiers';
import TileShell from './TileShell';

export default function ScoringTile() {
  const { user } = useUser() || {};
  const limits = getTierLimits(user?.tier || 'free');
  const scoringLimit = limits.scoring === Infinity ? 'Unlimited' : limits.scoring;

  return (
    <TileShell icon="📊" title="Scoring Engine" feature="scoring_basic" upgradeNote="Starter plan and above">
      <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Score your proposals against funder criteria before submission.
      </p>
      <div style={{
        background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)',
        padding: '12px 16px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--tgm-muted)', fontWeight: 600 }}>SCORES REMAINING</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tgm-navy)' }}>{scoringLimit}</span>
      </div>
      <button style={{
        width: '100%', padding: '10px', borderRadius: 'var(--tgm-radius-md)',
        background: 'var(--tgm-gold)', border: 'none',
        color: 'var(--tgm-navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
      }}>Score a Draft</button>
    </TileShell>
  );
}
