import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';
import { getDashboardModules, TIERS } from '../config/tiers';
import DraftTile from './tiles/DraftTile';
import ScoringTile from './tiles/ScoringTile';
import MatchingTile from './tiles/MatchingTile';
import AnalyticsTile from './tiles/AnalyticsTile';
import CalendarTile from './tiles/CalendarTile';
import ClientsTile from './tiles/ClientsTile';
import PortfolioTile from './tiles/PortfolioTile';
import AdminTile from './tiles/AdminTile';

const TILE_COMPONENTS = {
  draft: DraftTile,
  scoring: ScoringTile,
  matching: MatchingTile,
  analytics: AnalyticsTile,
  calendar: CalendarTile,
  clients: ClientsTile,
  portfolio: PortfolioTile,
  admin: AdminTile,
};

const TIER_META = {
  free:             { label: 'Free',             color: '#475569', bg: '#F1F5F9' },
  starter:          { label: 'Starter',          color: '#1D4ED8', bg: '#EFF6FF' },
  pro:              { label: 'Pro',              color: '#92400E', bg: '#FEF9C3' },
  agency_starter:   { label: 'Agency Starter',   color: '#166534', bg: '#F0FDF4' },
  agency_unlimited: { label: 'Agency Unlimited', color: '#065F46', bg: '#ECFDF5' },
  lifetime:         { label: 'Lifetime',         color: '#7E22CE', bg: '#FDF4FF' },
};

const ALL_MODULES = ['draft','scoring','matching','analytics','calendar','clients','portfolio','admin'];

export default function UnifiedDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useUser() || {};
  const tier = user?.tier || 'free';
  const tierConfig = TIERS[tier] || TIERS.free;
  const meta = TIER_META[tier] || TIER_META.free;
  const unlockedModules = getDashboardModules(tier);

  const handleLogout = () => {
    setUser?.(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--tgm-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'var(--tgm-navy)',
          }}>GM</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tgm-navy)', letterSpacing: '-.3px' }}>GrantsMaster</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14 }}>
          <span style={{ fontWeight: 700, color: 'var(--tgm-navy)', borderBottom: '2px solid var(--tgm-gold)', paddingBottom: 2 }}>Dashboard</span>
          <Link to="/workspace/new-draft" style={{ color: 'var(--tgm-muted)', fontWeight: 500 }}>New Draft</Link>
          <Link to="/pricing" style={{ color: 'var(--tgm-muted)', fontWeight: 500 }}>Pricing</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tier badge */}
          <span style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: meta.bg, color: meta.color, letterSpacing: '.3px',
          }}>{meta.label}</span>

          {/* User pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 'var(--tgm-radius-md)',
            border: '1px solid var(--tgm-border)', background: 'var(--tgm-bg)',
            fontSize: 13, color: 'var(--tgm-text)', fontWeight: 500,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: 'var(--tgm-navy)',
            }}>
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'User'}
            </span>
          </div>

          <button onClick={handleLogout} style={{
            padding: '6px 16px', borderRadius: 'var(--tgm-radius-md)',
            border: '1.5px solid var(--tgm-border)', background: 'transparent',
            color: 'var(--tgm-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all .15s',
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--tgm-error)'; e.currentTarget.style.color = 'var(--tgm-error)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--tgm-border)'; e.currentTarget.style.color = 'var(--tgm-muted)'; }}
          >Sign out</button>
        </div>
      </header>

      {/* ── Hero strip ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '32px 32px 40px',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--tgm-gold-light)', fontSize: 12, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Welcome back
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.2 }}>
            {user?.email?.split('@')[0] || 'Your'} Workspace
          </h1>
          <p style={{ fontSize: 14, opacity: .7, margin: '0 0 24px' }}>
            {tierConfig.name} plan · {unlockedModules.length} modules active
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Plan', value: tierConfig.name },
              { label: 'Drafts', value: tierConfig.limits?.drafts === Infinity ? 'Unlimited' : tierConfig.limits?.drafts ?? 0 },
              { label: 'Scoring', value: tierConfig.limits?.scoring === Infinity ? 'Unlimited' : tierConfig.limits?.scoring === 0 ? 'Locked' : tierConfig.limits?.scoring },
              { label: 'Team Seats', value: tierConfig.limits?.teamSeats === Infinity ? 'Unlimited' : tierConfig.limits?.teamSeats === 0 ? '—' : tierConfig.limits?.teamSeats },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 10, padding: '10px 20px', minWidth: 100,
              }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, opacity: .65, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--tgm-gold)' }}>{value}</p>
              </div>
            ))}

            {tier === 'free' && (
              <Link to="/pricing" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--tgm-gold)', borderRadius: 10, padding: '10px 20px',
                color: 'var(--tgm-navy)', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                alignSelf: 'center', marginLeft: 8,
              }}>⚡ Upgrade Plan</Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Module grid ── */}
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '32px 32px 48px' }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 2px' }}>Your Modules</h2>
            <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: 0 }}>
              {unlockedModules.length} of {ALL_MODULES.length} unlocked on {tierConfig.name}
            </p>
          </div>
          <Link to="/pricing" style={{
            fontSize: 13, fontWeight: 600, color: 'var(--tgm-blue)',
            padding: '6px 14px', borderRadius: 'var(--tgm-radius-sm)',
            border: '1px solid var(--tgm-border)',
          }}>View all plans →</Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {ALL_MODULES.map(moduleKey => {
            const TileComponent = TILE_COMPONENTS[moduleKey];
            if (!TileComponent) return null;
            return <TileComponent key={moduleKey} />;
          })}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--tgm-border)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--tgm-surface)',
      }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tgm-muted)' }}>
          © {new Date().getFullYear()} GrantsMaster · All rights reserved
        </p>
        <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
          <Link to="/pricing" style={{ color: 'var(--tgm-muted)' }}>Pricing</Link>
          <Link to="/contact" style={{ color: 'var(--tgm-muted)' }}>Support</Link>
        </div>
      </footer>
    </div>
  );
}
