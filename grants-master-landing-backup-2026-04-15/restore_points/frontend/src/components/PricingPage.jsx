
import React from 'react';

export default function PricingPage() {
  async function upgrade(tier) {
    try {
      const stored = localStorage.getItem('user');
      const email = stored ? JSON.parse(stored).email : null;
      await fetch(`/api/upgrade/${tier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      // navigate to dashboard after upgrade
      if (tier.startsWith('agency')) window.location.href = '/dashboard/agency?success=true';
      else window.location.href = '/dashboard/free?success=true';
    } catch (e) {
      console.error('Upgrade failed', e);
      alert('Upgrade failed.');
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>THE FINAL TGM TIER SYSTEM</h1>

      <section style={{ marginTop: 24 }}>
        <h2>🆓 FREE — THE TASTE OF POWER</h2>
        <p>Purpose: Let them feel the magic. Hit the ceiling fast.</p>
        <ul>
          <li>Included: 5 drafts</li>
          <li>Basic AI writing</li>
          <li>1 project</li>
          <li>No scoring</li>
          <li>No matching</li>
          <li>No analytics</li>
          <li>No export</li>
        </ul>
        <p><b>Upgrade Catalyst</b>: They can’t apply for real grants. Starter becomes the obvious next step.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>⭐ STARTER — THE SOLO WRITER</h2>
        <p>Purpose: Give them enough to succeed, but not enough to win consistently.</p>
        <ul>
          <li>Included: 100 drafts</li>
          <li>Unlimited projects</li>
          <li>Full AI writing</li>
          <li>Export PDF/DOC</li>
          <li>Basic scoring (readiness score only)</li>
          <li>Basic matching (10 grants/month)</li>
          <li>Basic analytics (draft quality trend)</li>
        </ul>
        <p><b>Upgrade Catalyst</b>: deeper scoring, full matching, reviewer simulation, advanced analytics.</p>
        <button onClick={() => upgrade('starter')}>Upgrade to Starter</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>🚀 PRO — THE STRATEGIST</h2>
        <p>Purpose: Give professionals the tools to win repeatedly.</p>
        <ul>
          <li>Included: Unlimited drafts</li>
          <li>Full scoring engine</li>
          <li>Full matching engine (minimal version)</li>
          <li>Reviewer simulation (AI prompt)</li>
          <li>Advanced analytics (simple charts)</li>
          <li>1 team seat</li>
          <li>Priority AI</li>
          <li>Grant calendar</li>
          <li>Project templates</li>
        </ul>
        <p><b>Upgrade Catalyst</b>: team workflows, client folders, bulk tools, portfolio insights.</p>
        <button onClick={() => upgrade('pro')}>Upgrade to Pro</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>🏢 AGENCY STARTER — THE SMALL FIRM</h2>
        <p>Purpose: Give small agencies the ability to manage clients without overwhelming them.</p>
        <ul>
          <li>Everything in Pro</li>
          <li>3 team seats</li>
          <li>Client folders (simple DB + list UI)</li>
          <li>Shared workspace</li>
          <li>Priority support</li>
          <li>White‑label reports (PDF header only)</li>
        </ul>
        <p><b>Upgrade Catalyst</b>: unlimited seats, bulk tools, portfolio intelligence.</p>
        <button onClick={() => upgrade('agency-starter')}>Upgrade to Agency Starter</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>🏢 AGENCY UNLIMITED — THE GRANT FIRM OS</h2>
        <p>Purpose: Give large agencies a full operating system.</p>
        <ul>
          <li>Everything in Agency Starter</li>
          <li>Unlimited team seats</li>
          <li>Bulk scoring</li>
          <li>Bulk matching</li>
          <li>Portfolio analytics</li>
          <li>Multi‑client dashboards</li>
          <li>Admin controls</li>
          <li>SLA support</li>
        </ul>
        <p><b>Upgrade Catalyst</b>: lifetime access, founder‑level perks, enterprise intelligence.</p>
        <button onClick={() => upgrade('agency-unlimited')}>Upgrade to Agency Unlimited</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>👑 LIFETIME — THE FOUNDERS CIRCLE</h2>
        <p>Purpose: Lock in your earliest believers.</p>
        <ul>
          <li>Everything in Pro forever</li>
          <li>Lifetime badge</li>
          <li>Early access</li>
          <li>Founding Member certificate</li>
          <li>VIP support</li>
          <li>No billing</li>
        </ul>
        <button onClick={() => upgrade('lifetime')}>Claim Lifetime</button>
      </section>
    </div>
  );
}
