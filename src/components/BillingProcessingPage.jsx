import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BillingProcessingPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const context = params.get('context');
  const returnPath = params.get('return');
  const safeReturnPath = returnPath && returnPath.startsWith('/') ? returnPath : null;
  const primaryHref = context === 'funder' ? (safeReturnPath || '/funder-api') : '/dashboard';
  const secondaryHref = context === 'funder' ? '/funder-api#request-key' : '/pricing';
  const primaryLabel = context === 'funder' ? 'Back to Funder API' : 'Go to Dashboard';
  const secondaryLabel = context === 'funder' ? 'Request API Key' : 'View Plans';
  const message = context === 'funder'
    ? 'Thanks. Your funder plan is being confirmed now. Once Stripe webhook confirmation lands, continue to the Request API Key section to receive your onboarding packet and activation steps.'
    : 'Thanks. Your account will update automatically as soon as Stripe confirms the payment through the secure webhook.';

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-xl rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Stripe checkout</p>
        <h1 className="mb-4 text-3xl font-bold text-[#003A8C]">We are confirming your payment.</h1>
        <p className="mb-8 text-sm leading-6 text-gray-600">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={primaryHref} className="rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#0A0F1A]">
            {primaryLabel}
          </Link>
          <Link to={secondaryHref} className="rounded-lg border border-[#E2E8F0] px-5 py-3 text-sm font-bold text-[#003A8C]">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
