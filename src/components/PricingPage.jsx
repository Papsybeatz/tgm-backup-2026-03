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

      {/* TESTIMONIALS */}
      <div style={{ background: '#F8F9FC', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(212,175,55,.15)',
              color: '#B8960C', fontSize: 11, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Beta Users</span>
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 10px' }}>
            Trusted by Early Grant Writers
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--tgm-muted)', marginBottom: 48, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            Real feedback from nonprofits, consultants, and agencies using TGM during beta.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { quote: 'GrantsMaster made me aware of documents I didn\'t even know I needed. My proposals are now funder-ready.', author: 'Amara J.', role: 'Nonprofit Director', location: 'Atlanta, GA', avatar: 'AJ', tier: 'Pro', stars: 5 },
              { quote: 'We won our first federal grant in 3 weeks. The AI engine writes better than our consultants — and costs 10x less.', author: 'Marcus T.', role: 'Agency Owner', location: 'New York, NY', avatar: 'MT', tier: 'Agency', stars: 5 },
              { quote: 'The Grant Readiness Checklist alone saved us from submitting an incomplete application. Game changer.', author: 'Priya S.', role: 'Grant Consultant', location: 'Chicago, IL', avatar: 'PS', tier: 'Starter', stars: 5 },
              { quote: 'I went from blank page to a 12-page proposal in under an hour. The funder loved it.', author: 'David O.', role: 'Community Organiser', location: 'Houston, TX', avatar: 'DO', tier: 'Pro', stars: 5 },
              { quote: 'Finally a tool built for real grant writers, not just tech people. The UI is clean and the AI actually understands nonprofit language.', author: 'Fatima K.', role: 'Programme Director', location: 'London, UK', avatar: 'FK', tier: 'Lifetime', stars: 5 },
              { quote: 'Our team of 6 now manages 20+ client proposals simultaneously. The multi-workspace dashboard is exactly what we needed.', author: 'Rachel M.', role: 'Grants Manager', location: 'Toronto, CA', avatar: 'RM', tier: 'Agency', stars: 5 },
            ].map(({ quote, author, role, location, avatar, tier, stars }) => (
              <div key={author} style={{
                background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0',
                padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,.06)', transition: 'box-shadow .2s',
              }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <svg key={i} width="16" height="16" fill="#D4AF37" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, flex: 1, margin: 0 }}>"{quote}"</p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid #F9F9F9' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--tgm-blue)', color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--tgm-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--tgm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role} · {location}</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: 'rgba(0,58,140,.1)', color: 'var(--tgm-blue)',
                    padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                  }}>{tier}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Trust bar */}
          <div style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 48, textAlign: 'center' }}>
            {[['500+', 'Beta Users'], ['$2.4M+', 'Grants Drafted'], ['4.9/5', 'Avg Rating'], ['94%', 'Would Recommend']].map(([val, label]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--tgm-blue)' }}>{val}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tgm-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
