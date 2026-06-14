import React from 'react';
import { useStripeCheckout } from '../hooks/useStripeCheckout';

// Stripe Live Price IDs
const PRICE_IDS = {
  starter:          'price_1TXqUt64TrQMI3mITWhRgTT0',
  pro:              'price_1TXrGK64TrQMI3mILgb0Cvq7',
  agency_starter:   'price_1TXrIy64TrQMI3mIQFIJhqCa',
  agency_unlimited: 'price_1TXrNJ64TrQMI3mI4SWeRNVD',
  lifetime:         'price_1TXrTl64TrQMI3mIKgqoP3iL',
};

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '$19.99/mo',
    description: 'Get 100 drafts per month, downloads, and 1 team seat.',
    priceId: PRICE_IDS.starter,
    primary: false,
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$49/mo',
    description: 'Unlimited drafts, advanced agent guidance, analytics dashboard, priority support.',
    priceId: PRICE_IDS.pro,
    primary: true,
  },
  {
    key: 'agency_starter',
    label: 'Agency Starter',
    price: '$79/mo',
    description: 'Up to 3 seats, unlimited drafts, client workspaces, white-label proposals.',
    priceId: PRICE_IDS.agency_starter,
    primary: false,
  },
  {
    key: 'agency_unlimited',
    label: 'Agency Unlimited',
    price: '$249/mo',
    description: 'Unlimited seats, unlimited drafts, unlimited client workspaces, full white-label, advanced analytics.',
    priceId: PRICE_IDS.agency_unlimited,
    primary: false,
  },
  {
    key: 'lifetime',
    label: 'Lifetime Deal',
    price: '$149 one-time',
    description: 'Everything in Pro forever. No billing. Founding Member badge.',
    priceId: PRICE_IDS.lifetime,
    primary: false,
  },
];

const UpgradePage = () => {
  const { startCheckout, loading, error } = useStripeCheckout();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
            Upgrade Your Plan
          </h1>
          <p style={{ fontSize: 16, color: 'var(--tgm-muted)', margin: 0 }}>
            Choose the plan that fits your workflow.
          </p>
        </div>

        {error && (
          <p style={{ color: '#DC2626', fontSize: 14, marginBottom: 20 }}>{error}</p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {PLANS.map(({ key, label, price, description, priceId, primary }) => (
            <div key={key} style={{
              background: 'var(--tgm-surface)',
              borderRadius: 'var(--tgm-radius-lg)',
              border: primary ? '2px solid var(--tgm-gold)' : '1px solid var(--tgm-border)',
              boxShadow: primary ? '0 4px 20px rgba(212,175,55,.15)' : 'var(--tgm-shadow-sm)',
              padding: 28,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tgm-navy)', margin: 0 }}>{label}</h3>
                <span style={{
                  background: primary ? 'rgba(212,175,55,.15)' : 'var(--tgm-bg)',
                  color: primary ? '#92400E' : 'var(--tgm-muted)',
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: 13, fontWeight: 600,
                }}>{price}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--tgm-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
                {description}
              </p>
              <button
                onClick={() => startCheckout(priceId)}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: loading ? '#93c5fd' : primary ? 'var(--tgm-gold)' : '#004aad',
                  border: 'none',
                  borderRadius: 'var(--tgm-radius-md)',
                  color: primary && !loading ? 'var(--tgm-navy)' : '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity .2s',
                }}
              >
                {loading ? 'Redirecting…' : `Upgrade to ${label}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
