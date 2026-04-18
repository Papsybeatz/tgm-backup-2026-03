import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '$19.99/mo',
    description: 'Get 5 drafts per month, downloads, and 1 team seat.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430',
    primary: false,
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$49/mo',
    description: 'Unlimited drafts, advanced agent guidance, analytics dashboard, priority support.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/6e1e2b7c-6c2a-4b2e-8e2a-7e2b7c6c2a4b',
    primary: true,
  },
  {
    key: 'agency_starter',
    label: 'Agency Starter',
    price: '$79/mo',
    description: 'Up to 10 seats, unlimited drafts, up to 5 client workspaces, white-label proposals.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/f9a73e20-a3dd-4bf3-a267-946258010531',
    primary: true,
  },
  {
    key: 'agency_unlimited',
    label: 'Agency Unlimited',
    price: '$249/mo',
    description: 'Unlimited seats, unlimited drafts, unlimited client workspaces, full white-label, advanced analytics.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5',
    primary: false,
  },
];

const UpgradePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      navigate('/dashboard?success=true', { replace: true });
    } else if (params.get('cancel') === 'true') {
      navigate('/pricing', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
            Upgrade Your Plan
          </h1>
          <p style={{ fontSize: 16, color: 'var(--tgm-muted)', margin: 0 }}>
            Choose the plan that fits your workflow.
          </p>
        </div>

        {/* Plan grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {PLANS.map(({ key, label, price, description, url, primary }) => (
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
                onClick={() => { window.location.href = url; }}
                style={{
                  width: '100%', padding: '12px',
                  background: primary ? 'var(--tgm-gold)' : 'transparent',
                  border: primary ? 'none' : '1.5px solid var(--tgm-border)',
                  borderRadius: 'var(--tgm-radius-md)',
                  color: primary ? 'var(--tgm-navy)' : 'var(--tgm-navy)',
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: primary ? 'var(--tgm-shadow-sm)' : 'none',
                  transition: 'opacity .2s, box-shadow .2s',
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = '.88'; }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
              >
                Upgrade to {label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
