import React from 'react';
import { Link } from 'react-router-dom';

/**
 * CaseStudiesSection
 *
 * Honest early-stage proof. We do NOT publish invented quotes, placeholder
 * testimonials, or unverified outcome metrics. Instead we show the proof we
 * can actually stand behind, and invite users to test the product themselves.
 *
 * Props:
 *   variant  "full" (default) — heading + three proof cards
 *            "inline"         — compact strip for the signup page
 */

const PROOF_POINTS = [
  {
    icon: '📍',
    title: 'Real users, real places',
    body: 'Nonprofits and agencies in New York, Texas, California, Virginia, and Canada use TGM today.',
  },
  {
    icon: '🏢',
    title: 'A named founder and a real company',
    body: 'Gee Oh Dee (Tech) LLC — reachable by phone and email. No anonymous AI wrapper.',
  },
  {
    icon: '✅',
    title: 'A product you can judge yourself',
    body: 'Run your own draft through Checkmate, free, with no credit card. Test the output, not the marketing.',
  },
];

export default function CaseStudiesSection({ variant = 'full' }) {
  const isInline = variant === 'inline';

  return (
    <section
      aria-label="Honest early-stage proof"
      style={{
        background: isInline ? 'rgba(0,58,140,.04)' : '#F8F9FC',
        padding: isInline ? '32px 24px' : '72px 24px',
        borderTop: isInline ? '1px solid rgba(0,58,140,.1)' : 'none',
      }}
    >
      <div style={{ maxWidth: isInline ? 960 : 1100, margin: '0 auto' }}>

        {/* Label */}
        <div style={{ textAlign: 'center', marginBottom: isInline ? 16 : 8 }}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(212,175,55,.15)',
            color: '#B8960C',
            fontSize: 11, fontWeight: 700,
            padding: '4px 14px', borderRadius: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Honest by default
          </span>
        </div>

        {/* Heading */}
        <h2 style={{
          textAlign: 'center',
          fontSize: isInline ? 22 : 32,
          fontWeight: 800,
          color: 'var(--tgm-navy, #0A0F1A)',
          margin: isInline ? '8px 0 6px' : '8px 0 10px',
        }}>
          We&apos;re early. We&apos;d rather earn proof than fake it.
        </h2>
        <p style={{
          textAlign: 'center', color: 'var(--tgm-muted, #6B7280)',
          marginBottom: isInline ? 28 : 48,
          maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
          fontSize: isInline ? 14 : 16,
        }}>
          We don&apos;t publish placeholder quotes or invented reviews. Here is what we can show you today.
        </p>

        {/* Proof cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isInline ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isInline ? 12 : 24,
        }}>
          {PROOF_POINTS.map(({ icon, title, body }) => (
            <div key={title} style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #EAECF0',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)',
              padding: isInline ? '18px 20px' : '24px 26px',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: isInline ? 20 : 24, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: isInline ? 14 : 15,
                  fontWeight: 700,
                  color: 'var(--tgm-navy, #0A0F1A)',
                }}>
                  {title}
                </p>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: isInline ? 13 : 14,
                  color: '#4B5563',
                  lineHeight: 1.6,
                }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 12, marginTop: isInline ? 24 : 36,
        }}>
          <Link to="/signup" style={{
            padding: '11px 24px', borderRadius: 9,
            background: '#D4AF37', color: '#0A0F1A',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>
            Run your own draft free →
          </Link>
          <a href="mailto:support@thegrantsmaster.com?subject=My%20TGM%20story" style={{
            padding: '11px 24px', borderRadius: 9,
            border: '1px solid #003A8C', color: '#003A8C',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>
            Using TGM? Tell us your story →
          </a>
        </div>

      </div>
    </section>
  );
}
