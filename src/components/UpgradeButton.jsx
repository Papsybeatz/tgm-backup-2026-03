import React from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';

/**
 * UpgradeButton
 *
 * Three cases:
 *   1. Free tier (href = '/signup') — navigates internally
 *   2. Paid tier with priceId — calls onCheckout() to start Stripe Checkout
 *   3. Lifetime member — shows a badge instead of a button
 */
export default function UpgradeButton({ tierKey, href, priceId, onCheckout, loading, onClick, children }) {
  const { user } = useUser();
  const navigate = useNavigate();

  if (user && user.tier === 'lifetime') {
    return (
      <div style={{
        padding: '10px', borderRadius: 6,
        background: 'linear-gradient(90deg,#fff9e6,#fff4cc)',
        color: '#6b4700', textAlign: 'center', fontWeight: 600,
      }}>
        Lifetime Member — unlimited access
      </div>
    );
  }

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (priceId && onCheckout) { onCheckout(); return; }
    if (href) {
      if (href.startsWith('http')) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        navigate(href);
      }
    }
  };

  const isDisabled = loading && !!priceId;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      style={{
        padding: '10px 14px', borderRadius: 8,
        background: isDisabled ? '#93c5fd' : '#004aad',
        color: '#fff', border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        width: '100%', fontWeight: 600,
        transition: 'background .2s, opacity .2s',
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      {isDisabled ? 'Redirecting to checkout…' : children}
    </button>
  );
}
