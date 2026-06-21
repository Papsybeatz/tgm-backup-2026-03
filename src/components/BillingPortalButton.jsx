import React, { useState } from 'react';
import { useUser } from './UserContext';

const TIER_LABELS = {
  free:             'Free',
  starter:          'Starter',
  pro:              'Pro',
  agency_starter:   'Agency',
  agency_unlimited: 'Agency+',
  lifetime:         'Lifetime',
};

// Badge colour per tier — background / text
const TIER_BADGE = {
  free:             { bg: '#F3F4F6',           color: '#6B7280' },
  starter:          { bg: 'rgba(0,58,140,.1)',  color: '#003A8C' },
  pro:              { bg: 'rgba(212,175,55,.15)', color: '#92400E' },
  agency_starter:   { bg: 'rgba(22,101,52,.1)', color: '#166534' },
  agency_unlimited: { bg: 'rgba(6,95,70,.12)',  color: '#065F46' },
  lifetime:         { bg: 'rgba(126,34,206,.12)', color: '#7E22CE' },
};

export default function BillingPortalButton({ compact = false }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tier = user?.tier || 'free';
  const isLifetime = tier === 'lifetime';
  const isFree = tier === 'free';
  const isPaid = !isFree;
  const badge = TIER_BADGE[tier] || TIER_BADGE.free;

  async function handleManageBilling() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/billing/portal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.upgradeUrl) {
        // Free user — send to pricing
        window.location.href = data.upgradeUrl;
        return;
      }
      if (data.url) {
        // Open Stripe customer portal in new tab
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }
      setError('Could not load billing portal. Please try again.');
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleManageBilling}
        disabled={loading}
        className="text-sm text-[#003A8C] underline hover:text-[#D4AF37] transition disabled:opacity-50"
      >
        {loading ? 'Loading…' : isFree ? 'Upgrade plan' : 'Manage billing'}
      </button>
    );
  }

  return (
    <div style={{
      background: 'var(--tgm-surface)',
      border: '1px solid var(--tgm-border)',
      borderRadius: 'var(--tgm-radius-xl)',
      padding: '24px 28px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tgm-muted)', fontWeight: 500 }}>Current Plan</p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--tgm-navy)' }}>
            {TIER_LABELS[tier] || tier}
            {isLifetime && <span style={{ marginLeft: 8, fontSize: 14, color: 'var(--tgm-gold)' }}>✦ Lifetime</span>}
          </p>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: 20,
          background: badge.bg,
          color: badge.color,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.3px',
        }}>
          {TIER_LABELS[tier] || tier}
        </div>
      </div>

      {/* Status message */}
      {isFree && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          Upgrade to unlock AI drafting, templates, and unlimited grants.
        </p>
      )}
      {tier === 'starter' && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          You're on Starter. Upgrade to Pro or Agency for team collaboration and advanced AI features.
        </p>
      )}
      {tier === 'pro' && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          You're on Pro. Upgrade to Agency for multi-client workspaces and reviewer AI.
        </p>
      )}
      {tier === 'agency_starter' && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          You're on Agency. Upgrade to Agency+ for unlimited clients and funder match intelligence.
        </p>
      )}
      {tier === 'agency_unlimited' && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          You have full Agency+ access — all features, unlimited clients, and funder match intelligence.
        </p>
      )}
      {isLifetime && (
        <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 16 }}>
          You have lifetime access — every feature, no renewals, forever.
        </p>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--tgm-error)', marginBottom: 12 }}>{error}</p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {isFree ? (
          <a
            href="/pricing"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Upgrade Plan →
          </a>
        ) : isLifetime ? (
          <button disabled className="btn-secondary" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            No billing required
          </button>
        ) : (
          <>
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Loading…' : 'Manage Billing'}
            </button>
            <button
              onClick={handleManageBilling}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--tgm-radius-md)',
                border: '1.5px solid #EF4444',
                background: 'transparent',
                color: '#EF4444',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all .15s',
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Cancel Subscription
            </button>
          </>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--tgm-muted)', marginTop: 12 }}>
        {isFree
          ? 'No credit card required to get started.'
          : isLifetime
          ? 'Purchased once — yours forever. No future charges.'
          : tier === 'agency_unlimited'
          ? 'All features unlocked. Manage or cancel anytime from the billing portal.'
          : 'Cancellation takes effect at the end of your billing period. Access continues until then.'}
      </p>
    </div>
  );
}
