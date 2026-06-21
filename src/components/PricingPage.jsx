import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UpgradeButton from './UpgradeButton';
import { useStripeCheckout } from '../hooks/useStripeCheckout';

const PLAN_COPY = [
  {
    key: 'free',
    stripeKey: null,
    name: 'Free',
    eyebrow: 'For small teams getting started',
    price: '$0',
    period: '/ forever',
    bestFor: 'Small nonprofits writing 1-2 grants per year.',
    features: [
      'AI drafting (Steve)',
      'Unlimited brainstorming',
      '3 saved drafts',
      'Basic Checkmate scoring',
      'Export to PDF/Word',
      'NY Grant Readiness Checklist',
      'Access to NY Grants page',
      'Email support',
    ],
    cta: 'Start Free',
    href: '/signup',
  },
  {
    key: 'starter',
    stripeKey: 'starter',
    name: 'Starter',
    eyebrow: 'For growing nonprofits',
    price: '$29',
    period: '/ month',
    bestFor: 'Nonprofits writing 3-10 grants per year.',
    intro: 'Includes everything in Free, plus:',
    features: [
      'Unlimited drafts',
      'Checkmate Pro (full scoring)',
      'Funder alignment insights',
      'Missing components detection',
      'Compliance checks',
      'Grant Fit Score',
      'Template library (single-org)',
      'Priority support',
    ],
    cta: 'Upgrade to Starter',
  },
  {
    key: 'pro',
    stripeKey: 'pro',
    name: 'Pro',
    eyebrow: 'For teams writing grants monthly',
    price: '$79',
    period: '/ month',
    bestFor: 'Nonprofits with recurring grant cycles.',
    intro: 'Includes everything in Starter, plus:',
    features: [
      'Team seats (up to 3)',
      'Shared workspace',
      'Team templates',
      'Team activity log',
      'Advanced Checkmate analytics',
      'NY funder intelligence',
      'NY compliance rules',
      'Document uploads',
      'Custom export formatting',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    key: 'agency_starter',
    stripeKey: 'agency_starter',
    name: 'Agency',
    eyebrow: 'For consultants & multi-client teams',
    price: '$149',
    period: '/ month',
    bestFor: 'Consultants, agencies, and multi-client grant firms.',
    intro: 'Includes everything in Pro, plus:',
    features: [
      'Multi-client dashboard',
      'Client folders',
      'Client-specific templates',
      'White-label Checkmate reports',
      'White-label proposal exports',
      'Bulk Checkmate scoring',
      'Bulk CSV export',
      'Client activity logs',
      'Team seats (up to 10)',
      'Role-based permissions',
      'Priority support',
    ],
    cta: 'Upgrade to Agency',
  },
  {
    key: 'agency_unlimited',
    stripeKey: 'agency_unlimited',
    name: 'Agency+',
    eyebrow: 'For high-volume teams',
    price: '$299',
    period: '/ month',
    bestFor: 'Large agencies, economic development teams, and enterprise-level grant operations.',
    intro: 'Includes everything in Agency, plus:',
    features: [
      'Unlimited team seats',
      'Unlimited client folders',
      'Full white-label branding',
      'API access (future)',
      'Dedicated success manager',
      'Quarterly strategy reviews',
      'Early access to new features',
    ],
    cta: 'Upgrade to Agency+',
  },
];

const COMPARISON_ROWS = [
  ['AI drafting (Steve)', true, true, true, true, true],
  ['Unlimited drafts', false, true, true, true, true],
  ['Checkmate Pro scoring', false, true, true, true, true],
  ['Funder alignment', false, true, true, true, true],
  ['Grant Fit Score', false, true, true, true, true],
  ['NY funder intelligence', false, false, true, true, true],
  ['Team seats', false, false, '3', '10', 'Unlimited'],
  ['Multi-client workspace', false, false, false, true, true],
  ['White-label reports', false, false, false, true, true],
  ['Bulk scoring', false, false, false, true, true],
  ['Client templates', false, false, false, true, true],
  ['Activity logs', false, false, true, true, true],
];

const FAQS = [
  ['Do I need a credit card to start?', 'No — the Free plan is forever free.'],
  ['Can I switch plans anytime?', 'Yes — upgrades and downgrades are instant.'],
  ['Is my data private?', 'Yes. Your data is never used to train AI models.'],
  ['Does TGM work outside New York?', 'Yes — NY is our first localized workspace, with more states coming soon.'],
  ['Is TGM for consultants?', 'Yes — Agency and Agency+ are built specifically for multi-client workflows.'],
];

const SECURITY_POINTS = [
  'Your data is never used to train AI models',
  'Encrypted at rest and in transit',
  'Human-in-the-loop workflows',
  'SOC-2 style security practices',
  'GDPR/CCPA aligned',
  'Secure document storage',
];

const LIFETIME_FEATURES = [
  'Unlimited drafts',
  'Checkmate Pro',
  'Funder alignment',
  'Grant Fit Score',
  'NY funder intelligence',
  'NY compliance rules',
  'Team seats (1)',
  'Template library',
  'Document uploads',
  'Export tools',
];

function CheckIcon({ active = true }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: active ? 'rgba(22,163,74,.12)' : '#F1F5F9',
      color: active ? '#15803D' : '#94A3B8',
      fontSize: 11,
      fontWeight: 800,
      flexShrink: 0,
    }}>
      {active ? '✓' : '✕'}
    </span>
  );
}

function cellValue(value) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <CheckIcon active={false} />;
  return <span style={{ fontWeight: 800, color: 'var(--tgm-navy)' }}>{value}</span>;
}

export default function PricingPage() {
  const { startCheckout, loading: checkoutLoading, error: checkoutError } = useStripeCheckout();
  const [priceIds, setPriceIds] = useState({});

  useEffect(() => {
    fetch('/api/checkout/prices')
      .then((res) => res.json())
      .then((data) => setPriceIds(data.prices || {}))
      .catch(() => setPriceIds({}));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', color: 'var(--tgm-text)' }}>
      <section style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '72px 24px 84px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ margin: '0 0 14px', color: 'var(--tgm-gold-light)', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Simple, transparent pricing
          </p>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 900, margin: '0 0 18px', lineHeight: 1.05 }}>
            Built for nonprofits, consultants, and agencies
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.7, opacity: .82, margin: '0 auto 28px', maxWidth: 720 }}>
            Choose the plan that matches your grant-writing capacity. Start free. Upgrade anytime.
          </p>
          <Link to="/signup" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 24px',
            borderRadius: 10,
            background: 'var(--tgm-gold)',
            color: 'var(--tgm-navy)',
            fontWeight: 900,
            textDecoration: 'none',
          }}>
            Get Started Free
          </Link>
          <p style={{ margin: '16px 0 0', fontSize: 13, opacity: .72 }}>No credit card required. Cancel anytime.</p>
        </div>
      </section>

      <section style={{ padding: '56px 24px 72px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          alignItems: 'stretch',
        }}>
          {PLAN_COPY.map((plan) => {
            const priceId = plan.stripeKey ? priceIds[plan.stripeKey] : null;
            return (
              <article key={plan.key} style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
                background: '#fff',
                borderRadius: 12,
                border: plan.highlighted ? '2px solid var(--tgm-gold)' : '1px solid var(--tgm-border)',
                boxShadow: plan.highlighted ? '0 14px 40px rgba(212,175,55,.18)' : 'var(--tgm-shadow-sm)',
                padding: 24,
              }}>
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute',
                    top: -13,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--tgm-gold)',
                    color: 'var(--tgm-navy)',
                    padding: '4px 16px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}
                <p style={{ margin: '0 0 8px', color: '#B8960C', fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {plan.eyebrow}
                </p>
                <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 900, color: 'var(--tgm-navy)' }}>{plan.name}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--tgm-navy)' }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--tgm-muted)', fontWeight: 700 }}>{plan.period}</span>
                </div>
                <p style={{ margin: '0 0 16px', minHeight: 44, fontSize: 14, lineHeight: 1.55, color: 'var(--tgm-muted)' }}>
                  <strong style={{ color: 'var(--tgm-text)' }}>Best for:</strong> {plan.bestFor}
                </p>
                {plan.intro && <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--tgm-navy)' }}>{plan.intro}</p>}
                <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, lineHeight: 1.45 }}>
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <UpgradeButton
                  tierKey={plan.key}
                  href={plan.href}
                  priceId={priceId}
                  onCheckout={priceId ? () => startCheckout(priceId) : undefined}
                  loading={checkoutLoading}
                >
                  {plan.cta}
                </UpgradeButton>
              </article>
            );
          })}
        </div>

        {checkoutError && (
          <p style={{ textAlign: 'center', marginTop: 24, color: '#DC2626', fontSize: 14 }}>
            {checkoutError}
          </p>
        )}
      </section>

      <section style={{ padding: '0 24px 72px', maxWidth: 1120, margin: '0 auto' }}>
        <article style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 28,
          alignItems: 'center',
          background: '#fff',
          border: '2px solid var(--tgm-gold)',
          borderRadius: 16,
          boxShadow: '0 18px 48px rgba(212,175,55,.18)',
          padding: 28,
        }}>
          <div>
            <p style={{ margin: '0 0 10px', color: '#B8960C', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Founder&apos;s Offer
            </p>
            <h2 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 900, color: 'var(--tgm-navy)' }}>
              Lifetime Access — Early Supporter Deal
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--tgm-navy)' }}>$149</span>
              <span style={{ fontSize: 15, color: 'var(--tgm-muted)', fontWeight: 800 }}>one-time</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.7, color: 'var(--tgm-muted)' }}>
              Limited to the first 200 users. Built for early adopters who want long-term access without a subscription.
            </p>
            <p style={{ margin: '0 0 22px', fontSize: 14, fontWeight: 900, color: 'var(--tgm-navy)' }}>
              Includes everything in Pro, forever.
            </p>
            <UpgradeButton
              tierKey="lifetime"
              priceId={priceIds.lifetime}
              onCheckout={priceIds.lifetime ? () => startCheckout(priceIds.lifetime) : undefined}
              loading={checkoutLoading}
            >
              Unlock Lifetime Access
            </UpgradeButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {LIFETIME_FEATURES.map((feature) => (
              <div key={feature} style={{ display: 'flex', gap: 9, alignItems: 'center', background: '#FFFBEB', border: '1px solid rgba(212,175,55,.28)', borderRadius: 10, padding: '11px 12px' }}>
                <CheckIcon />
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tgm-navy)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section style={{ background: '#fff', borderTop: '1px solid var(--tgm-border)', borderBottom: '1px solid var(--tgm-border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 28px', fontSize: 32, fontWeight: 900, color: 'var(--tgm-navy)', textAlign: 'center' }}>Compare plans</h2>
          <div style={{ overflowX: 'auto', border: '1px solid var(--tgm-border)', borderRadius: 12 }}>
            <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Feature', 'Free', 'Starter', 'Pro', 'Agency', 'Agency+'].map((heading) => (
                    <th key={heading} style={{ padding: '14px 16px', textAlign: heading === 'Feature' ? 'left' : 'center', color: 'var(--tgm-navy)', borderBottom: '1px solid var(--tgm-border)' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(([feature, free, starter, pro, agency, agencyPlus]) => (
                  <tr key={feature}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F7', fontWeight: 800 }}>{feature}</td>
                    {[free, starter, pro, agency, agencyPlus].map((value, index) => (
                      <td key={`${feature}-${index}`} style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F7', textAlign: 'center' }}>
                        {cellValue(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', background: '#F8F9FC' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'start' }}>
          <div>
            <p style={{ margin: '0 0 10px', color: '#B8960C', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Trust & Security
            </p>
            <h2 style={{ margin: '0 0 14px', fontSize: 32, fontWeight: 900, color: 'var(--tgm-navy)' }}>
              Security, privacy, and compliance — built for nonprofits
            </h2>
            <p style={{ margin: '0 0 22px', color: 'var(--tgm-muted)', lineHeight: 1.7 }}>
              Your data is protected with enterprise-grade security.
            </p>
            <Link to="/privacy" style={{ color: 'var(--tgm-blue)', fontWeight: 900, textDecoration: 'none' }}>
              View Security & Privacy →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {SECURITY_POINTS.map((point) => (
              <div key={point} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: '1px solid var(--tgm-border)', borderRadius: 10, padding: 14 }}>
                <CheckIcon />
                <span style={{ fontSize: 14, fontWeight: 700 }}>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 28px', fontSize: 32, fontWeight: 900, color: 'var(--tgm-navy)', textAlign: 'center' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {FAQS.map(([question, answer]) => (
              <details key={question} style={{ border: '1px solid var(--tgm-border)', borderRadius: 10, padding: '16px 18px', background: '#fff' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 900, color: 'var(--tgm-navy)' }}>{question}</summary>
                <p style={{ margin: '12px 0 0', color: 'var(--tgm-muted)', lineHeight: 1.65 }}>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        color: '#fff',
        textAlign: 'center',
        padding: '72px 24px',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 36, fontWeight: 900 }}>Ready to increase your grant-writing capacity?</h2>
        <p style={{ margin: '0 0 28px', fontSize: 18, opacity: .8 }}>Start free today — upgrade anytime.</p>
        <Link to="/signup" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 24px',
          borderRadius: 10,
          background: 'var(--tgm-gold)',
          color: 'var(--tgm-navy)',
          fontWeight: 900,
          textDecoration: 'none',
        }}>
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
