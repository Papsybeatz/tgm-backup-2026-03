import React from 'react';
import { Link } from 'react-router-dom';

export default function GrantWorkflowBlueprintSuccess() {
  return (
    <div style={{
      minHeight: '100vh', background: '#F8F9FC',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Minimal nav */}
      <nav style={{
        background: '#0A0F1A', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>TGM</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>The Grants Master</span>
        </Link>
      </nav>

      {/* Success card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '1px solid #EAECF0',
          boxShadow: '0 4px 32px rgba(0,0,0,.08)',
          padding: '56px 48px', maxWidth: 520, width: '100%', textAlign: 'center',
        }}>

          {/* Check icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #003A8C 0%, #0A0F1A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14l6 6L22 8" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A0F1A', margin: '0 0 12px' }}>
            You're in. Check your email.
          </h1>

          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, margin: '0 0 8px' }}>
            The Grant Workflow Blueprint is on its way to your inbox.
          </p>
          <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 40px' }}>
            If you don't see it in 2 minutes, check your spam folder and mark us as safe.
          </p>

          {/* What's next */}
          <div style={{
            background: '#F8F9FC', borderRadius: 12,
            padding: '20px 24px', marginBottom: 32, textAlign: 'left',
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#003A8C', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              While you wait
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Open TGM and run your first funder match — free, no credit card',
                'See how the alignment engine scores your org against real funders',
                'Use the proposal builder on your top match',
              ].map(item => (
                <li key={item} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                  <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Primary CTA */}
          <Link
            to="/signup"
            style={{
              display: 'block', width: '100%', padding: '14px 24px',
              background: 'linear-gradient(135deg, #003A8C 0%, #0A0F1A 100%)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              borderRadius: 10, textDecoration: 'none',
              textAlign: 'center', boxSizing: 'border-box',
            }}
          >
            Explore TGM — Start Free →
          </Link>

          <p style={{ margin: '16px 0 0', fontSize: 12, color: '#9CA3AF' }}>
            Free tier · No credit card · No time limit
          </p>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#0A0F1A', padding: '24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          © {new Date().getFullYear()} The Grants Master ·{' '}
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>Privacy</Link>
        </p>
      </footer>

    </div>
  );
}
