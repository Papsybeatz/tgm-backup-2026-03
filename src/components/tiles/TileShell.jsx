import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../UserContext';
import { hasFeature } from '../../config/tiers';

/**
 * Shared shell for every dashboard tile.
 * Handles locked/unlocked state, consistent TGM styling.
 */
export default function TileShell({ feature, icon, title, upgradeNote, children }) {
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const unlocked = !feature || hasFeature(tier, feature);

  if (!unlocked) {
    return (
      <div style={{
        background: 'var(--tgm-surface)',
        borderRadius: 'var(--tgm-radius-lg)',
        border: '1px solid var(--tgm-border)',
        boxShadow: 'var(--tgm-shadow-sm)',
        padding: '24px',
        display: 'flex', flexDirection: 'column',
        opacity: .75,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Locked watermark */}
        <div style={{
          position: 'absolute', top: 12, right: 14,
          fontSize: 11, fontWeight: 700, letterSpacing: '.4px',
          color: 'var(--tgm-muted)', background: 'var(--tgm-bg)',
          padding: '3px 10px', borderRadius: 20,
          border: '1px solid var(--tgm-border)',
        }}>🔒 LOCKED</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--tgm-bg)', border: '1px solid var(--tgm-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>{icon}</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tgm-navy)' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tgm-muted)' }}>{upgradeNote}</p>
          </div>
        </div>

        <div style={{
          flex: 1, background: 'var(--tgm-bg)', borderRadius: 'var(--tgm-radius-md)',
          padding: '16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tgm-muted)', textAlign: 'center' }}>
            Upgrade to unlock this module
          </p>
        </div>

        <Link to="/pricing" style={{
          display: 'block', textAlign: 'center',
          padding: '10px', borderRadius: 'var(--tgm-radius-md)',
          background: 'var(--tgm-navy)', color: 'var(--tgm-gold)',
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
          transition: 'opacity .15s',
        }}
          onMouseOver={e => e.currentTarget.style.opacity = '.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >Upgrade to unlock →</Link>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--tgm-surface)',
      borderRadius: 'var(--tgm-radius-lg)',
      border: '1px solid var(--tgm-border)',
      boxShadow: 'var(--tgm-shadow-sm)',
      padding: '24px',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow .2s, border-color .2s',
    }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--tgm-shadow-md)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,.4)'; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'var(--tgm-shadow-sm)'; e.currentTarget.style.borderColor = 'var(--tgm-border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(212,175,55,.15), rgba(212,175,55,.05))',
          border: '1px solid rgba(212,175,55,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{icon}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tgm-navy)' }}>{title}</h3>
          <div style={{ width: 28, height: 2, background: 'var(--tgm-gold)', borderRadius: 2, marginTop: 4 }} />
        </div>
      </div>
      {children}
    </div>
  );
}
