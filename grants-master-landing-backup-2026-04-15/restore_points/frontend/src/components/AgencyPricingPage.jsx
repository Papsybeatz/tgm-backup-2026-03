// ...existing code up to line 50...
import React from 'react';

const starterCheckoutLink = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430';
const unlimitedCheckoutLink = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5';

export default function AgencyPricingPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>Agency Pricing</h1>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, border: '1px solid #cce0ff', borderRadius: 8, padding: '1.5rem', background: '#f4f8ff' }}>
          <h2>Agency Starter</h2>
          <p><b>$79/mo</b></p>
          <ul>
            <li>Up to 10 seats</li>
            <li>Unlimited drafts</li>
            <li>Up to 5 client workspaces</li>
            <li>White-label proposals</li>
            <li>Analytics dashboard</li>
            <li>Priority support</li>
          </ul>
          <button
            style={{ padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: 6, width: '100%', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => window.location.href = starterCheckoutLink}
          >
            Choose Agency Starter
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 300, border: '1px solid #cce0ff', borderRadius: 8, padding: '1.5rem', background: '#fff8f4' }}>
          <h2>Agency Unlimited</h2>
          <p><b>$249/mo</b></p>
          <ul>
            <li>Unlimited seats</li>
            <li>Unlimited drafts</li>
            <li>Unlimited client workspaces</li>
            <li>Full white-label</li>
            <li>Advanced analytics</li>
            <li>Priority support + onboarding</li>
          </ul>
          <button
            style={{ padding: '0.75rem', background: '#ff9800', color: 'white', border: 'none', borderRadius: 6, width: '100%', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => window.location.href = unlimitedCheckoutLink}
          >
            Choose Agency Unlimited
          </button>
        </div>
      </div>
    </div>
  );
}
