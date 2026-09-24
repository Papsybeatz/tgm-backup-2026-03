import React from 'react';
import { Link } from 'react-router-dom';

const LINKEDIN = 'https://www.linkedin.com/in/thomas-clottey';
const FACEBOOK = 'https://www.facebook.com/TheGrantsMaster';
const PHONE = '(540) 566-9760';
const PHONE_HREF = 'tel:+15405669760';
const EMAIL = 'support@thegrantsmaster.com';
const ENTITY = 'Gee Oh Dee (Tech) LLC';
const ADDRESS = '4210 Electric Road #1038, Roanoke, VA 24018, United States';

const REGIONS = ['New York', 'Texas', 'California', 'Virginia', 'Canada'];

const SECURITY = [
  'Payments processed by Stripe — card details never touch our servers',
  'SSL-encrypted sessions in transit',
  'Draft content encrypted at rest (Supabase / PostgreSQL on AWS, US-East)',
  'GDPR & CCPA aligned — deletion on request within 30 days',
  'No advertising trackers or third-party tracking cookies',
  'Your drafts are never used to train AI models — our AI provider (Groq) does not train on API data (Groq Services Agreement §8.2)',
  'Client folders are isolated — a folder and its drafts, templates, Checkmate reports, and documents are reachable only by the owner or users granted explicit per-client access (owner / editor / viewer)',
  'Security practices designed around SOC 2 principles',
];

const PURCHASING = [
  'Free plan is forever free',
  'No credit card required to start',
  'Cancel anytime',
  'Transparent pricing — no hidden fees',
];

const PROOF_ROADMAP = [
  { status: 'Launched', detail: 'The Grants Master public beta', done: true },
  { status: 'Real users', detail: 'Nonprofits and agencies across New York, Texas, California, Virginia & Canada', done: true },
  { status: 'In progress', detail: 'First named customer case study (publishing with permission)', done: false },
  { status: 'In progress', detail: 'G2, Capterra, and Trustpilot profiles', done: false },
  { status: 'Upcoming', detail: 'Product Hunt launch', done: false },
];

function Section({ id, n, title, children }) {
  return (
    <section id={id} style={{ borderTop: '1px solid #E2E8F0', paddingTop: 32, marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        {n && <span style={{ color: '#B8960C', fontWeight: 800, fontSize: 14 }}>{n}</span>}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A0F1A', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: '#334155' }}>{children}</div>
    </section>
  );
}

export default function TrustPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px', color: '#1e293b' }}>
      <Link to="/" style={{ color: '#003A8C', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
        ← Back to GrantsMaster
      </Link>

      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0A0F1A', margin: '32px 0 12px' }}>
        Trust &amp; Transparency
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: '#334155', marginBottom: 8 }}>
        Nonprofits work with sensitive budgets, board strategies, and compliance requirements. Trust isn&apos;t optional — it&apos;s the foundation of everything we build. Here is exactly how The Grants Master earns it.
      </p>

      <Section id="founder" n="01" title="Built by a Real Founder & a Real Company">
        <div style={{
          border: '1px solid #E2E8F0', background: '#F8F9FC',
          borderRadius: 14, padding: '24px 26px',
        }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A0F1A' }}>Thomas Clottey</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, color: '#475569' }}>Full Stack / AI Software Developer</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, color: '#475569' }}>Founder, The Grants Master</p>

          <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#0A0F1A' }}>{ENTITY}</p>
            <p style={{ margin: 0 }}>{ADDRESS}</p>
            <p style={{ margin: '10px 0 0' }}>
              <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" style={{ color: '#003A8C', fontWeight: 600 }}>LinkedIn</a>
              {' · '}
              <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" style={{ color: '#003A8C', fontWeight: 600 }}>Facebook</a>
              {' · '}
              <a href={PHONE_HREF} style={{ color: '#003A8C', fontWeight: 600 }}>{PHONE}</a>
              {' · '}
              <a href={`mailto:${EMAIL}`} style={{ color: '#003A8C', fontWeight: 600 }}>{EMAIL}</a>
            </p>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: 14, color: '#334155' }}>
            We build in public, stay transparent, and stay reachable. No anonymous AI wrapper. No mystery company.
          </p>
        </div>
      </Section>

      <Section id="usage" n="02" title="Proven Use Across the U.S. & Canada">
        <p style={{ marginTop: 0 }}>TGM is actively used by nonprofits and agencies in:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REGIONS.map((r) => (
            <span key={r} style={{
              border: '1px solid rgba(212,175,55,.5)',
              color: '#92400E', background: 'rgba(212,175,55,.12)',
              borderRadius: 999, padding: '4px 14px', fontSize: 13, fontWeight: 700,
            }}>{r}</span>
          ))}
        </div>
        <p>
          This geographic spread is verifiable today. It shows real adoption without inflating numbers.
        </p>
      </Section>

      <Section id="results" n="03" title="Real Results — Published Only With Permission">
        <p style={{ marginTop: 0 }}>
          We&apos;re a new platform, and we&apos;re honest about it. We don&apos;t publish placeholder quotes, invented reviews, or case studies we can&apos;t verify.
        </p>
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
          <li>Real users across New York, Texas, California, Virginia, and Canada</li>
          <li>Named founder, registered U.S. company, reachable by phone and email</li>
          <li>First customer case studies in progress — publishing only with written permission</li>
        </ul>
        <p>
          Want to be one of our first featured stories?{' '}
          <a href={`mailto:${EMAIL}?subject=My%20TGM%20story`} style={{ color: '#003A8C', fontWeight: 600 }}>{EMAIL}</a>.
        </p>
      </Section>

      <Section id="security" n="04" title="Transparent Security & Data Practices">
        <p style={{ marginTop: 0 }}>Your data is protected with enterprise-grade safeguards:</p>
        <ul style={{ margin: '12px 0 0', paddingLeft: 0, listStyle: 'none', lineHeight: 1.9 }}>
          {SECURITY.map((s) => (
            <li key={s} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: '#B8960C', fontWeight: 800 }}>✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p>
          We treat nonprofit data with the same seriousness as a financial institution.
        </p>
      </Section>

      <Section id="purchasing" n="05" title="Clear, Low-Friction Purchasing">
        <ul style={{ margin: '0', paddingLeft: 0, listStyle: 'none', lineHeight: 1.9 }}>
          {PURCHASING.map((s) => (
            <li key={s} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: '#B8960C', fontWeight: 800 }}>✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p>Nonprofits hate surprises. We keep everything simple.</p>
      </Section>

      <Section id="proof" n="06" title="We won't fake proof. We're building it.">
        <p style={{ marginTop: 0 }}>
          We don&apos;t claim awards we haven&apos;t earned or reviews we don&apos;t have. Here is exactly where we are.
        </p>
        <ol style={{ margin: '12px 0 0', paddingLeft: 0, listStyle: 'none', lineHeight: 1.9 }}>
          {PROOF_ROADMAP.map((p) => (
            <li key={p.detail} style={{ display: 'flex', gap: 10 }}>
              <span>{p.done ? '✅' : '🔄'}</span>
              <span>
                <strong style={{ color: '#0A0F1A' }}>{p.status}:</strong> {p.detail}
              </span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          As each one goes live, we&apos;ll link it right here.
        </p>
      </Section>

      <Section id="mission" n="07" title="Our Mission">
        <p style={{ margin: 0 }}>
          We built TGM to give every nonprofit the grant-writing capacity of a full-time staff member — without the cost. Clearer proposals. Faster drafting. Better alignment. Less stress.
        </p>
      </Section>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0', fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#0A0F1A' }}>The Grants Master is a product of {ENTITY}.</p>
        <p style={{ margin: '2px 0 0' }}>{ADDRESS}</p>
        <p style={{ margin: '2px 0 0' }}>
          <a href={`mailto:${EMAIL}`} style={{ color: '#003A8C' }}>{EMAIL}</a>
          {' · '}
          <a href={PHONE_HREF} style={{ color: '#003A8C' }}>{PHONE}</a>
        </p>
      </div>
    </div>
  );
}
