import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSkin } from '../hooks/useSkin.jsx';
import SkinToggle from './SkinToggle.jsx';
import UpgradeButton from './UpgradeButton';

const LS_STORE = 'grantsmaster';

const TIERS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    tagline: 'The Taste of Power',
    description: 'Let them feel the magic. Hit the ceiling fast.',
    features: [
      '5 drafts',
      'Basic AI writing',
      '1 project',
      'No scoring',
      'No matching',
      'No analytics',
      'No export'
    ],
    cta: 'Start Free',
    href: '/signup',
    highlighted: false
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/mo',
    tagline: 'The Solo Writer',
    description: 'Give them enough to succeed, but not enough to win consistently.',
    features: [
      '100 drafts',
      'Unlimited projects',
      'Full AI writing',
      'Export PDF/DOC',
      'Basic scoring (10/mo)',
      'Basic matching (10/mo)',
      'Basic analytics'
    ],
    cta: 'Upgrade',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430',
    highlighted: false
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    tagline: 'The Strategist',
    description: 'Give professionals the tools to win repeatedly.',
    features: [
      'Unlimited drafts',
      'Full scoring engine',
      'Full matching engine',
      'Reviewer simulation',
      'Advanced analytics',
      '1 team seat',
      'Priority AI',
      'Grant calendar',
      'Project templates'
    ],
    cta: 'Upgrade',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/9fb78e01-b5f3-413d-a0ad-40faf8a76e37',
    highlighted: true
  },
  {
    key: 'agency_starter',
    name: 'Agency Starter',
    price: '$79',
    period: '/mo',
    tagline: 'The Small Firm',
    description: 'Give small agencies the ability to manage clients without overwhelming them.',
    features: [
      'Everything in Pro',
      '3 team seats',
      'Client folders',
      'Shared workspace',
      'Priority support',
      'White-label reports'
    ],
    cta: 'Upgrade',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/f9a73e20-a3dd-4bf3-a267-946258010531',
    highlighted: false
  },
  {
    key: 'agency_unlimited',
    name: 'Agency Unlimited',
    price: '$249',
    period: '/mo',
    tagline: 'The Grant Firm OS',
    description: 'Give large agencies a full operating system.',
    features: [
      'Everything in Agency Starter',
      'Unlimited team seats',
      'Bulk scoring',
      'Bulk matching',
      'Portfolio analytics',
      'Multi-client dashboards',
      'Admin controls',
      'SLA support'
    ],
    cta: 'Upgrade',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5',
    highlighted: false
  },
  {
    key: 'lifetime',
    name: 'Lifetime Deal',
    price: '$149',
    period: ' one-time',
    tagline: 'The Founders Circle',
    description: 'Lock in your earliest believers.',
    features: [
      'Everything in Pro forever',
      'Lifetime badge',
      'Early access',
      'Founding Member certificate',
      'VIP support',
      'No billing'
    ],
    cta: 'Buy Lifetime',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/d61187d4-183d-4ea2-8084-dc210b1bc010',
    highlighted: false,
    special: true
  }
];

export default function PricingPage() {
  const { t } = useTranslation();
  const { skin } = useSkin();

  const containerStyle = {
    minHeight: '100vh',
    background: skin === 'futuristic'
      ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)'
      : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #f9fafb 100%)',
    padding: '40px 20px',
    position: 'relative'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: 48
  };

  const titleStyle = {
    fontSize: 40,
    fontWeight: 700,
    color: skin === 'futuristic' ? '#fff' : '#111',
    marginBottom: 12
  };

  const subtitleStyle = {
    fontSize: 18,
    color: skin === 'futuristic' ? 'rgba(255,255,255,0.6)' : '#6b7280'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
    maxWidth: 1200,
    margin: '0 auto'
  };

  const getCardStyle = (highlighted, special) => ({
    background: skin === 'futuristic'
      ? highlighted 
        ? 'rgba(0, 240, 255, 0.08)'
        : 'rgba(255, 255, 255, 0.03)'
      : highlighted 
        ? '#fff' 
        : '#fff',
    backdropFilter: skin === 'futuristic' ? 'blur(12px)' : 'none',
    border: `1px solid ${
      highlighted 
        ? (skin === 'futuristic' ? '#00f0ff' : '#3b82f6')
        : (skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb')
    }`,
    borderRadius: 20,
    padding: 28,
    boxShadow: highlighted 
      ? (skin === 'futuristic' ? '0 0 30px rgba(0, 240, 255, 0.2)' : '0 20px 40px rgba(0, 0, 0, 0.1)')
      : (skin === 'futuristic' ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.05)'),
    position: 'relative',
    transition: 'transform 0.2s, box-shadow 0.2s'
  });

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', right: 20, top: 20 }}>
        <SkinToggle />
      </div>

      <div style={headerStyle}>
        <h1 style={titleStyle}>Pricing that scales with your impact</h1>
        <p style={subtitleStyle}>Start free. Upgrade when you're ready.</p>
      </div>

      <div style={gridStyle}>
        {TIERS.map((tier) => (
          <div key={tier.key} style={getCardStyle(tier.highlighted, tier.special)}>
            {tier.highlighted && (
              <div style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: skin === 'futuristic' ? '#00f0ff' : '#3b82f6',
                color: skin === 'futuristic' ? '#000' : '#fff',
                padding: '4px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600
              }}>
                Most Popular
              </div>
            )}
            
            <h3 style={{
              fontSize: 22,
              fontWeight: 700,
              color: skin === 'futuristic' ? '#fff' : '#111',
              marginBottom: 4
            }}>
              {tier.name}
            </h3>
            
            <p style={{
              fontSize: 14,
              color: skin === 'futuristic' ? 'rgba(255,255,255,0.5)' : '#9ca3af',
              marginBottom: 16
            }}>
              {tier.tagline}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 40,
                fontWeight: 700,
                color: skin === 'futuristic' ? '#fff' : '#111'
              }}>
                {tier.price}
              </span>
              <span style={{
                fontSize: 14,
                color: skin === 'futuristic' ? 'rgba(255,255,255,0.5)' : '#9ca3af'
              }}>
                {tier.period}
              </span>
            </div>

            {tier.earlyLabel && (
              <p style={{
                fontSize: 12,
                color: skin === 'futuristic' ? '#00f0ff' : '#8b5cf6',
                marginTop: 8,
                fontWeight: 500
              }}>
                {tier.earlyLabel}
              </p>
            )}

            <ul style={{
              marginTop: 24,
              marginBottom: 24,
              padding: 0,
              listStyle: 'none'
            }}>
              {tier.features.map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 12,
                  fontSize: 14,
                  color: skin === 'futuristic' ? 'rgba(255,255,255,0.8)' : '#4b5563'
                }}>
                  <span style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: skin === 'futuristic' ? 'rgba(0, 240, 255, 0.2)' : '#dbeafe',
                    color: skin === 'futuristic' ? '#00f0ff' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    flexShrink: 0,
                    marginTop: 2
                  }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <UpgradeButton 
              tierKey={tier.key} 
              href={tier.href}
            >
              {tier.cta}
            </UpgradeButton>
          </div>
        ))}
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: 48,
        color: skin === 'futuristic' ? 'rgba(255,255,255,0.4)' : '#9ca3af',
        fontSize: 14
      }}>
        All plans include a 14-day money-back guarantee
      </div>
    </div>
  );
}