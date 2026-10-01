import { useEffect, useState } from 'react';

/**
 * Renders only testimonials that a real user submitted and an admin approved.
 *
 * There is no fallback content and no placeholder. If nothing has been approved
 * this renders an honest empty state, never a quote we wrote ourselves. That is
 * the whole point: an anonymous testimonial hides *who* said it, never *whether*
 * someone said it — so filling this space with invented words would spend the
 * only thing the page was built to earn.
 *
 * The submitter's email is never sent to the client; the public endpoint does
 * not select it.
 */
export default function TestimonialWall() {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    let alive = true;
    fetch('/api/testimonials')
      .then((r) => r.json())
      .then((body) => {
        if (!alive) return;
        const items =
          body && body.success === true && Array.isArray(body.testimonials)
            ? body.testimonials
            : [];
        setState({ status: 'ready', items });
      })
      .catch(() => {
        if (alive) setState({ status: 'ready', items: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  // While loading, render nothing rather than a spinner: a trust page should not
  // flash a skeleton where proof is supposed to be.
  if (state.status === 'loading') return null;

  if (state.items.length === 0) {
    return (
      <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#64748b' }}>
        No published quotes yet. We&apos;d rather show an empty wall than a borrowed one — every
        quote here will come from a real user, published only with their permission.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
      {state.items.map((t) => {
        const who = [t.role, t.orgType, t.region].filter(Boolean).join(', ');
        return (
          <blockquote
            key={t.id}
            style={{
              margin: 0,
              border: '1px solid #E2E8F0',
              borderLeft: '3px solid #B8960C',
              background: '#FFFDF7',
              borderRadius: 12,
              padding: '16px 18px',
            }}
          >
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#0A0F1A' }}>
              &ldquo;{t.quote}&rdquo;
            </p>
            {who ? (
              <footer style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>— {who}</footer>
            ) : null}
          </blockquote>
        );
      })}
    </div>
  );
}
