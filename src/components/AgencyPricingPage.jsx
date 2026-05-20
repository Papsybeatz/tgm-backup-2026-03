import React from 'react';
import { useStripeCheckout } from '../hooks/useStripeCheckout';

const PRICE_IDS = {
  agency_starter:   'price_1TXrIy64TrQMI3mIQFIJhqCa',
  agency_unlimited: 'price_1TXrNJ64TrQMI3mI4SWeRNVD',
};

const AgencyPricingPage = () => {
  const { startCheckout, loading, error } = useStripeCheckout();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
          Agency Plans
        </h1>
        <p style={{ fontSize: 16, color: 'var(--tgm-muted)', margin: '0 0 40px' }}>
          Built for grant writing firms managing multiple clients.
        </p>

        {error && (
          <p style={{ color: '#DC2626', fontSize: 14, marginBottom: 20 }}>{error}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {[
            {
              key: 'agency_starter',
              label: 'Agency Starter',
              price: '$79/mo',
              features: ['Everything in Pro', '3 team seats', 'Client folders', 'Shared workspace', 'Priority support', 'White-label reports'],
              priceId: PRICE_IDS.agency_starter,
              primary: false,
            },
            {
              key: 'agency_unlimited',
              label: 'Agency Unlimited',
              price: '$249/mo',
              features: ['Everything in Agency Starter', 'Unlimited team seats', 'Bulk scoring', 'Bulk matching', 'Portfolio analytics', 'Multi-client dashboards', 'Admin controls', 'SLA support'],
              priceId: PRICE_IDS.agency_unlimited,
              primary: true,
            },
          ].map(({ key, label, price, features, priceId, primary }) => (
            <div key={key} style={{
              background: 'var(--tgm-surface)',
              borderRadius: 'var(--tgm-radius-lg)',
              border: primary ? '2px solid var(--tgm-gold)' : '1px solid var(--tgm-border)',
              boxShadow: primary ? '0 8px 32px rgba(212,175,55,.18)' : 'var(--tgm-shadow-sm)',
              padding: 28,
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 4px' }}>{label}</h3>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--tgm-blue)', margin: '0 0 20px' }}>{price}</p>
              <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--tgm-text)' }}>
                    <span style={{ color: 'var(--tgm-gold)', fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => startCheckout(priceId)}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: loading ? '#93c5fd' : primary ? 'var(--tgm-gold)' : '#004aad',
                  border: 'none', borderRadius: 'var(--tgm-radius-md)',
                  color: primary && !loading ? 'var(--tgm-navy)' : '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Redirecting…' : `Get ${label}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgencyPricingPage;
