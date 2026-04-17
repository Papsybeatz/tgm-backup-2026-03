
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const UpgradePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Simulate LemonSqueezy redirect with ?success=true for demo
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      if (params.get('plan') === 'starter') {
        navigate('/dashboard/starter?success=true', { replace: true });
      } else if (params.get('plan') === 'pro') {
        navigate('/dashboard/pro?success=true', { replace: true });
      } else if (params.get('plan') === 'agency_starter') {
        navigate('/dashboard/agency-starter?success=true', { replace: true });
      } else if (params.get('plan') === 'agency_unlimited') {
        navigate('/dashboard/agency-unlimited?success=true', { replace: true });
      }
    } else if (params.get('cancel') === 'true') {
      if (params.get('plan') === 'starter') {
        navigate('/pricing', { replace: true });
      } else if (params.get('plan') === 'pro') {
        navigate('/upgrade', { replace: true });
      } else {
        navigate('/agency/pricing', { replace: true });
      }
    }
  }, [location, navigate]);

  const handleUpgradeStarter = () => {
    window.location.href = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/2efea376-b1ae-4032-a611-2d43d03d3430';
  };
  const handleUpgradePro = () => {
    window.location.href = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/6e1e2b7c-6c2a-4b2e-8e2a-7e2b7c6c2a4b'; // <-- Replace with correct Pro ID if needed
  };
  const handleUpgradeAgencyStarter = () => {
    window.location.href = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/f9a73e20-a3dd-4bf3-a267-946258010531';
  };
  const handleUpgradeAgencyUnlimited = () => {
    window.location.href = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>Upgrade Your Plan</h1>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Starter</h2>
        <p>Get 5 drafts per month, downloads, and 1 team seat.</p>
        <button
          onClick={handleUpgradeStarter}
          style={{
            padding: '0.75rem',
            backgroundColor: 'green',
            color: 'white',
            width: '100%',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          Upgrade to Starter ($19.99/mo)
        </button>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Pro</h2>
        <p>Unlimited drafts, advanced agent guidance, analytics dashboard, priority support.</p>
        <button
          onClick={handleUpgradePro}
          style={{
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: 'white',
            width: '100%',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          Upgrade to Pro ($49/mo)
        </button>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Agency Starter</h2>
        <p>Up to 10 seats, unlimited drafts, up to 5 client workspaces, white-label proposals, analytics dashboard, priority support.</p>
        <button
          onClick={handleUpgradeAgencyStarter}
          style={{
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: 'white',
            width: '100%',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          Upgrade to Agency Starter ($79/mo)
        </button>
      </div>
      <div>
        <h2>Agency Unlimited</h2>
        <p>Unlimited seats, unlimited drafts, unlimited client workspaces, full white-label, advanced analytics, priority support + onboarding.</p>
        <button
          onClick={handleUpgradeAgencyUnlimited}
          style={{
            padding: '0.75rem',
            backgroundColor: '#ff9800',
            color: 'white',
            width: '100%',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Upgrade to Agency Unlimited ($249/mo)
        </button>
      </div>
    </div>
  );
};

export default UpgradePage;
