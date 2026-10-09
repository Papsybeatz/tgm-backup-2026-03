import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UpgradeButton from './UpgradeButton';
import { useStripeCheckout } from '../hooks/useStripeCheckout';
import { PRICING_FAQS } from '../lib/faqs';
import { TIERS } from '../config/tiers';
import {
  ANNUAL_DISCOUNT,
  NEED_BASED_DISCOUNT,
  annualTotal,
  annualMonthlyPrice,
  needBasedMonthlyPrice,
} from '../config/discounts';

/**
 * The ladder, in order. `free` is the funnel and is not sold, but it is rendered
 * from the same list so the cards and the comparison table cannot disagree about
 * what Free includes.
 *
 * Internal keys stay `starter` / `pro` / `agency_starter`; the display names live
 * in src/config/tiers.js so this page, the dashboard and the billing portal
 * cannot drift apart.
 */
const LADDER = ['free', 'starter', 'pro', 'agency_starter'];
const SELLABLE = ['starter', 'pro', 'agency_starter'];

const MONTHLY_PRICE = { free: 0, starter: 29, pro: 79, agency_starter: 149 };

/**
 * Feature key -> the sentence a buyer reads.
 *
 * Every key here exists in a tier's feature list in src/config/tiers.js, and
 * backend/tests/tier-feature-existence.test.js requires each of those keys to
 * name the code that implements it. So a label can only reach this page if
 * something is actually behind it — the old card sold funder matching,
 * analytics and a template library that returned 501.
 */
const FEATURE_LABELS = {
  draft_basic: 'AI drafting with Steve',
  draft_unlimited: 'Unlimited saved drafts',
  scoring_basic: 'Checkmate scoring',
  scoring_detailed: 'Checkmate scoring, criterion by criterion',
  version_history: 'Version history',
  email_delivery: 'Email delivery of drafts',
  export_pdf: 'Export to PDF',
  export_doc: 'Export to Word',
  client_folders: 'Client folders',
  client_aware_steve: 'Client-aware Steve',
};

/**
 * Free on every tier, so it is never a reason to upgrade. These two stay in the
 * comparison table (where "included everywhere" is the honest story) and are
 * stripped from the paid cards.
 */
const FREE_ON_EVERY_TIER = ['export_pdf', 'export_doc'];

/**
 * Comparison rows are the union of feature keys plus the seat limit, built from
 * the config rather than typed out, so a config change cannot leave the table
 * advertising something no tier has.
 */
const COMPARISON_FEATURES = [
  'draft_basic',
  'draft_unlimited',
  'scoring_basic',
  'scoring_detailed',
  'version_history',
  'email_delivery',
  'export_pdf',
  'export_doc',
  'client_folders',
  'client_aware_steve',
];

const PLAN_COPY = {
  free: {
    eyebrow: 'Start here',
    bestFor: 'Small nonprofits exploring TGM.',
    cta: 'Start Free',
    href: '/signup',
  },
  starter: {
    eyebrow: 'For growing nonprofits',
    bestFor: 'Nonprofits writing several grants a year.',
    // Market benchmark, not a TGM performance claim. Keep it sourced to the
    // market and never restate it as something TGM has measured.
    priceAnchor: 'Most nonprofits pay $1,500–$10,000 for a single freelance proposal.',
    cta: 'Choose Grant Writer',
  },
  pro: {
    eyebrow: 'For consultants and small teams',
    bestFor: 'Consultants and teams running more than one client.',
    cta: 'Choose Grant Consultant',
    highlighted: true,
  },
  agency_starter: {
    eyebrow: 'For grant firms',
    bestFor: 'Firms carrying a portfolio of client work.',
    cta: 'Choose Grant Agency',
  },
};

/** What this tier adds over the one below it — the upgrade pitch, not the spec sheet. */
function addedFeatures(tierKey) {
  const index = LADDER.indexOf(tierKey);
  const previous = index > 0 ? LADDER[index - 1] : null;
  const before = previous ? TIERS[previous].features : [];
  return TIERS[tierKey].features.filter(
    (feature) => !before.includes(feature) && !FREE_ON_EVERY_TIER.includes(feature)
  );
}

/** Whole dollars render without cents; anything else keeps them. */
function money(value) {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/**
 * The price a card shows, for the selected interval and discount.
 *
 * The yearly total is the source of truth (see src/config/discounts.js), so the
 * monthly-equivalent is derived from it and can never disagree with the amount
 * Stripe charges. The need-based discount multiplies on top, matching how the
 * backend applies it as a coupon that stacks with the annual price.
 */
function quoteFor(tierKey, { interval, needBased }) {
  const monthly = MONTHLY_PRICE[tierKey] || 0;
  if (!monthly) return { amount: '$0', unit: '/ forever', note: null };

  const factor = needBased ? 1 - NEED_BASED_DISCOUNT.rate : 1;

  if (interval === 'annual') {
    const perMonth = annualMonthlyPrice(monthly) * factor;
    const yearly = annualTotal(monthly) * factor;
    return {
      amount: money(Number(perMonth.toFixed(2))),
      unit: '/ month',
      note: `billed ${money(Number(yearly.toFixed(2)))} yearly`,
    };
  }

  return {
    amount: money(Number((monthly * factor).toFixed(2))),
    unit: '/ month',
    note: null,
  };
}

const SECURITY_POINTS = [
  'Your data is never used to train AI models',
  'Client folders are isolated — access requires ownership or an explicit per-client permission',
  'Encrypted at rest and in transit',
  'Human-in-the-loop workflows',
  'Security inherited from independently audited providers (Railway, Vercel, Supabase, GitHub)',
  'GDPR & CCPA: deletion on request',
  'Secure document storage',
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
  const [interval, setInterval] = useState('annual');
  const [needBased, setNeedBased] = useState(false);
  const [searchParams] = useSearchParams();
  const checkoutStarted = useRef(false);

  useEffect(() => {
    fetch('/api/checkout/prices')
      .then((res) => {
        if (!res.ok) throw new Error('Pricing is temporarily unavailable');
        return res.json();
      })
      .then((data) => setPriceIds(data.prices || {}))
      .catch(() => setPriceIds({}));
  }, []);

  // Annual only exists once the annual price IDs are configured. Until then the
  // page falls back to monthly-only rather than offering a plan the checkout
  // would reject with a 400.
  const annualIds = priceIds.annual || {};
  const annualAvailable = SELLABLE.some((key) => Boolean(annualIds[key]));
  const effectiveInterval = annualAvailable ? interval : 'monthly';

  // The need-based checkbox is hidden until the coupon is configured, because
  // the server answers a need-based session with 503 when it is not.
  const needBasedAvailable = Boolean(priceIds.needBasedAvailable);
  const needBasedApplied = needBasedAvailable && needBased;

  const comparisonRows = useMemo(() => [
    ...COMPARISON_FEATURES.map((key) => ({
      label: FEATURE_LABELS[key],
      values: LADDER.map((tierKey) => TIERS[tierKey].features.includes(key)),
    })),
    {
      label: 'Team seats',
      values: LADDER.map((tierKey) => {
        const seats = TIERS[tierKey].limits.teamSeats;
        if (!seats) return false;
        return seats === Infinity ? 'Unlimited' : String(seats);
      }),
    },
  ], []);

  useEffect(() => {
    const priceId = searchParams.get('checkout');
    const token = localStorage.getItem('token');
    if (priceId && token && !checkoutStarted.current) {
      checkoutStarted.current = true;
      startCheckout(priceId, { cancelPath: '/pricing' });
    }
  }, [priceIds, searchParams, startCheckout]);

  const priceIdFor = (tierKey) => {
    if (tierKey === 'free') return null;
    if (effectiveInterval === 'annual') return annualIds[tierKey] || null;
    return priceIds[tierKey] || null;
  };

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
            Buy the capacity you need. Every plan does the whole job — you are never
            buying back a feature the plan below should have had.
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

      <section style={{ padding: '40px 24px 0', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {annualAvailable && (
            <div style={{ display: 'inline-flex', background: '#E8EDF5', borderRadius: 999, padding: 4 }}>
              {['monthly', 'annual'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setInterval(option)}
                  aria-pressed={effectiveInterval === option}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '9px 20px',
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: effectiveInterval === option ? 'var(--tgm-navy)' : 'transparent',
                    color: effectiveInterval === option ? '#fff' : 'var(--tgm-navy)',
                  }}
                >
                  {option === 'monthly' ? 'Monthly' : `Annual — save ${Math.round(ANNUAL_DISCOUNT * 100)}%`}
                </button>
              ))}
            </div>
          )}

          {needBasedAvailable && (
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              border: '1px solid var(--tgm-border)',
              borderRadius: 999,
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={needBased}
                onChange={(event) => setNeedBased(event.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              {NEED_BASED_DISCOUNT.label}
            </label>
          )}
        </div>
      </section>

      <section style={{ padding: '32px 24px 72px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          alignItems: 'stretch',
        }}>
          {LADDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const copy = PLAN_COPY[tierKey];
            const isFree = tierKey === 'free';
            const quote = quoteFor(tierKey, { interval: effectiveInterval, needBased: needBasedApplied });
            const priceId = priceIdFor(tierKey);

            // Free lists what it includes; paid tiers list only what they add,
            // because "Everything in X, plus" has to be a true superset claim.
            const features = isFree
              ? tier.features.map((key) => FEATURE_LABELS[key])
              : addedFeatures(tierKey).map((key) => FEATURE_LABELS[key]);

            const seats = tier.limits.teamSeats;
            if (!isFree && seats) {
              features.push(seats === Infinity ? 'Unlimited team seats' : `Team seats (up to ${seats})`);
            }

            return (
              <article key={tierKey} style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
                background: '#fff',
                borderRadius: 12,
                border: copy.highlighted ? '2px solid var(--tgm-gold)' : '1px solid var(--tgm-border)',
                boxShadow: copy.highlighted ? '0 14px 40px rgba(212,175,55,.18)' : 'var(--tgm-shadow-sm)',
                padding: 24,
              }}>
                {copy.highlighted && (
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
                  {copy.eyebrow}
                </p>
                <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 900, color: 'var(--tgm-navy)' }}>{tier.name}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--tgm-navy)' }}>{quote.amount}</span>
                  <span style={{ fontSize: 14, color: 'var(--tgm-muted)', fontWeight: 700 }}>{quote.unit}</span>
                </div>
                {quote.note && (
                  <p style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: '#15803D' }}>{quote.note}</p>
                )}
                {copy.priceAnchor && (
                  <p style={{ margin: '8px 0 12px', fontSize: 13, lineHeight: 1.55, color: 'var(--tgm-muted)' }}>
                    {copy.priceAnchor}
                  </p>
                )}
                <p style={{ margin: '0 0 16px', minHeight: 44, fontSize: 14, lineHeight: 1.55, color: 'var(--tgm-muted)' }}>
                  <strong style={{ color: 'var(--tgm-text)' }}>Best for:</strong> {copy.bestFor}
                </p>
                {!isFree && (
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--tgm-navy)' }}>
                    Everything in {TIERS[LADDER[LADDER.indexOf(tierKey) - 1]].name}, plus:
                  </p>
                )}
                <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {features.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, lineHeight: 1.45 }}>
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <UpgradeButton
                  tierKey={tierKey}
                  href={copy.href}
                  priceId={priceId}
                  onCheckout={priceId ? () => startCheckout(priceId, {
                    needBased: needBasedApplied,
                    loginRedirectPath: `/pricing?checkout=${encodeURIComponent(priceId)}`,
                  }) : undefined}
                  loading={checkoutLoading}
                >
                  {copy.cta}
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

      <section style={{ background: '#fff', borderTop: '1px solid var(--tgm-border)', borderBottom: '1px solid var(--tgm-border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 28px', fontSize: 32, fontWeight: 900, color: 'var(--tgm-navy)', textAlign: 'center' }}>Compare plans</h2>
          <div style={{ overflowX: 'auto', border: '1px solid var(--tgm-border)', borderRadius: 12 }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Feature', ...LADDER.map((tierKey) => TIERS[tierKey].name)].map((heading) => (
                    <th key={heading} style={{ padding: '14px 16px', textAlign: heading === 'Feature' ? 'left' : 'center', color: 'var(--tgm-navy)', borderBottom: '1px solid var(--tgm-border)' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ label, values }) => (
                  <tr key={label}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F7', fontWeight: 800 }}>{label}</td>
                    {values.map((value, index) => (
                      <td key={`${label}-${index}`} style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F7', textAlign: 'center' }}>
                        {cellValue(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--tgm-muted)' }}>
            Export to PDF and Word is included on every plan, including Free.
          </p>
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
              Your data is protected on independently audited infrastructure — Railway, Vercel, Supabase and GitHub.
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
            {PRICING_FAQS.map(({ q: question, a: answer }) => (
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
