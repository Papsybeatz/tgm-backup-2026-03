import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '$19.99/mo',
    description: 'Get 5 drafts per month, downloads, and 1 team seat.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430',
    variant: 'btn-success',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$49/mo',
    description: 'Unlimited drafts, advanced agent guidance, analytics dashboard, priority support.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/6e1e2b7c-6c2a-4b2e-8e2a-7e2b7c6c2a4b',
    variant: 'btn-primary',
  },
  {
    key: 'agency_starter',
    label: 'Agency Starter',
    price: '$79/mo',
    description: 'Up to 10 seats, unlimited drafts, up to 5 client workspaces, white-label proposals.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/f9a73e20-a3dd-4bf3-a267-946258010531',
    variant: 'btn-primary',
  },
  {
    key: 'agency_unlimited',
    label: 'Agency Unlimited',
    price: '$249/mo',
    description: 'Unlimited seats, unlimited drafts, unlimited client workspaces, full white-label, advanced analytics.',
    url: 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5',
    variant: 'btn-secondary',
  },
];

const UpgradePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      navigate('/dashboard?success=true', { replace: true });
    } else if (params.get('cancel') === 'true') {
      navigate('/pricing', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="content-wrapper">
      <h1 className="heading-xl mb-sm">Upgrade Your Plan</h1>
      <p className="section-subtitle">Choose the plan that fits your workflow.</p>

      <div className="grid grid-2">
        {PLANS.map(({ key, label, price, description, url, variant }) => (
          <div key={key} className="card">
            <div className="card-header flex-between">
              <span>{label}</span>
              <span className="badge badge-primary">{price}</span>
            </div>
            <div className="card-body">
              <p className="body-text mb-md">{description}</p>
              <button
                className={`btn ${variant} w-full`}
                onClick={() => { window.location.href = url; }}
              >
                Upgrade to {label}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpgradePage;
