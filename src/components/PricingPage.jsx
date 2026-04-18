import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UpgradeButton from './UpgradeButton';

const TIERS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    tagline: 'The Taste of Power',
    description: 'Let them feel the magic. Hit the ceiling fast.',
    features: ['5 drafts','Basic AI writing','1 project','No scoring','No matching','No analytics','No export'],
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
    features: ['100 drafts','Unlimited projects','Full AI writing','Export PDF/DOC','Basic scoring (10/mo)','Basic matching (10/mo)','Basic analytics'],
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
    features: ['Unlimited drafts','Full scoring engine','Full matching engine','Reviewer simulation','Advanced analytics','1 team seat','Priority AI','Grant calendar','Project templates'],
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
    features: ['Everything in Pro','3 team seats','Client folders','Shared workspace','Priority support','White-label reports'],
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
    features: ['Everything in Agency Starter','Unlimited team seats','Bulk scoring','Bulk matching','Portfolio analytics','Multi-client dashboards','Admin controls','SLA support'],
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
    features: ['Everything in Pro forever','Lifetime badge','Early access','Founding Member certificate','VIP support','No billing'],
    cta: 'Buy Lifetime',
    href: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/d61187d4-183d-4ea2-8084-dc210b1bc010',
    highlighted: false,
    special: true
  }
];

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '64px 24px 72px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'var(--tgm-navy)'
          }}>GM</div>
          <Link to="/" style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.3px' }}>
            GrantsMaster
          </Link>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
          Pricing that scales with your impact
        </h1>
        <p style={{ fontSize: 18, opacity: .75, margin: 0 }}>
          Start free. Upgrade when you're ready.
        </p>
      </div>

      {/* Cards */}
      <div style={{ padding: '56px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {TIERS.map((tier) => (
            <div key={tier.key} style={{
              background: 'var(--tgm-surface)',
              borderRadius: 'var(--tgm-radius-lg)',
              border: tier.highlighted
                ? '2px solid var(--tgm-gold)'
                : tier.special
                  ? '2px solid #7E22CE'
                  : '1px solid var(--tgm-border)',
              boxShadow: tier.highlighted
                ? '0 8px 32px rgba(212,175,55,.18)'
                : 'var(--tgm-shadow-sm)',
              padding: 28,
              position: 'relative',
              transition: 'box-shadow .2s, border-color .2s',
            }}>
              {tier.highlighted && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--tgm-gold)',
                  color: 'var(--tgm-navy)',
                  padding: '4px 18px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                }}>Most Popular</div>
              )}
              {tier.special && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#7E22CE',
                  color: '#fff',
                  padding: '4px 18px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                }}>Founders Deal</div>
              )}

              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 4px' }}>
                {tier.name}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--tgm-muted)', margin: '0 0 16px' }}>
                {tier.tagline}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--tgm-navy)' }}>{tier.price}</span>
                <span style={{ fontSize: 14, color: 'var(--tgm-muted)' }}>{tier.period}</span>
              </div>

              <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier.features.map((feature, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--tgm-text)' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: 'rgba(212,175,55,.15)', color: 'var(--tgm-gold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                    }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <UpgradeButton tierKey={tier.key} href={tier.href}>
                {tier.cta}
              </UpgradeButton>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 48, color: 'var(--tgm-muted)', fontSize: 14 }}>
          All plans include a 14-day money-back guarantee
        </p>
      </div>
    </div>
  );
}
