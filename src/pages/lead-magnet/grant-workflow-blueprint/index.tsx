import React from 'react';
import { Link } from 'react-router-dom';
import LeadMagnetForm from './components/LeadMagnetForm';

const BENEFITS = [
  {
    icon: '⏱',
    title: '12 hrs → 3.5 hrs per proposal',
    desc: 'The exact workflow that cuts grant writing time without cutting quality.',
  },
  {
    icon: '🎯',
    title: 'Funder alignment before you write a word',
    desc: 'The 4-step research framework that separates 20% win rates from 40%+.',
  },
  {
    icon: '📋',
    title: '8 ready-to-use proposal templates',
    desc: 'Federal, foundation, corporate, community — structured from 10,000+ winning proposals.',
  },
  {
    icon: '🔁',
    title: 'Reusable content system',
    desc: 'Build a proposal library so every new grant takes less time than the last.',
  },
  {
    icon: '✅',
    title: 'Pre-submission checklist',
    desc: 'The 12-point review that catches the mistakes funders reject proposals for.',
  },
];

export default function GrantWorkflowBlueprintPage() {
  return (
    <>
      {/* SEO metadata injected via Helmet or document.title — see head block below */}
      <head>
        <title>Grant Workflow Blueprint — Free Download | TGM</title>
        <meta
          name="description"
          content="Download the free Grant Workflow Blueprint: the exact system grant writers use to cut proposal time from 12 hours to 3.5 hours and improve win rates by 40%+."
        />
        <meta property="og:title" content="Grant Workflow Blueprint — Free Download | TGM" />
        <meta
          property="og:description"
          content="The exact grant writing workflow used by nonprofits winning more grants in less time. Free download — no credit card."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.thegrantsmaster.com/lead-magnet/grant-workflow-blueprint" />
      </head>

      <div style={{ minHeight: '100vh', background: '#F8F9FC', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* Minimal nav */}
        <nav style={{
          background: '#0A0F1A', padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>TGM</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 400 }}>The Grants Master</span>
          </Link>
          <Link to="/signup" style={{
            fontSize: 13, fontWeight: 600, color: '#D4AF37',
            textDecoration: 'none', border: '1px solid rgba(212,175,55,.4)',
            padding: '6px 16px', borderRadius: 6,
          }}>
            Start Free →
          </Link>
        </nav>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, #0A0F1A 0%, #003A8C 100%)',
          padding: '72px 24px 80px', textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', background: 'rgba(212,175,55,.15)',
            color: '#D4AF37', fontSize: 11, fontWeight: 700,
            padding: '4px 14px', borderRadius: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            Free Download
          </span>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800,
            color: '#fff', margin: '0 auto 16px', maxWidth: 720, lineHeight: 1.15,
          }}>
            The Grant Workflow Blueprint
          </h1>
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,.75)',
            maxWidth: 560, margin: '0 auto 12px', lineHeight: 1.6,
          }}>
            The exact system grant writers use to cut proposal time from{' '}
            <strong style={{ color: '#D4AF37' }}>12 hours to 3.5 hours</strong>{' '}
            and improve win rates by <strong style={{ color: '#D4AF37' }}>40%+</strong>.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 8 }}>
            No credit card. No spam. Instant download.
          </p>
        </section>

        {/* Main content — benefits + form */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 48, alignItems: 'start',
          }}>

            {/* Benefits */}
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0F1A', marginBottom: 8 }}>
                What's inside
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32, lineHeight: 1.6 }}>
                Built from 10,000+ grant proposals and the workflows of development teams
                winning at 40%+ rates.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {BENEFITS.map(({ icon, title, desc }) => (
                  <li key={title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(0,58,140,.08)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {icon}
                    </span>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: '#0A0F1A' }}>
                        {title}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
                        {desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Social proof */}
              <div style={{
                marginTop: 40, padding: '20px 24px',
                background: 'linear-gradient(135deg, #0A0F1A 0%, #003A8C 100%)',
                borderRadius: 12,
              }}>
                <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#D4AF37' }}>
                  $180k
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                  in new grants won in 90 days by a 3-person team using this workflow.
                  Win rate: 22% → 41%.
                </p>
              </div>
            </div>

            {/* Form card */}
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid #EAECF0',
              boxShadow: '0 4px 24px rgba(0,0,0,.08)',
              padding: '36px 32px',
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0A0F1A' }}>
                Download the Blueprint
              </h3>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: '#6B7280' }}>
                Free. Instant. No credit card required.
              </p>
              <LeadMagnetForm />
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer style={{
          background: '#0A0F1A', padding: '32px 24px', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
            © {new Date().getFullYear()} The Grants Master ·{' '}
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}>Privacy</Link>
            {' · '}
            <Link to="/terms" style={{ color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}>Terms</Link>
          </p>
        </footer>

      </div>
    </>
  );
}
