// UpgradeModal.jsx
// Conversion-optimized modal for upgrade triggers
import React, { useState, useEffect, useRef } from 'react';
import InviteRequestForm from './InviteRequestForm';
import { loadStripeScript } from '../utils/loadStripe';
import styles from './LandingPage.module.css';

export default function UpgradeModal({ currentTier = 'free', user = {}, onClose }) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const modalRef = useRef(null);

  // Disable background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    }
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Upgrade logic
  const handleStarterUpgrade = () => {
    // Load Stripe.js and handle failures gracefully (tracking prevention or network issues)
    loadStripeScript().then((Stripe) => {
      // Proceed with existing checkout flow that depends on Stripe
      // If legacy StripeCheckout is expected, call it safely
      if (window.StripeCheckout) {
        try { window.StripeCheckout(); } catch (e) { /* ignore */ }
      }
      // Otherwise, redirect to hosted checkout or open modal handled elsewhere
      // For now, use existing behavior to navigate to hosted checkout if configured
      if (typeof window !== 'undefined' && window.location) {
        // no-op here; actual redirect handled by parent handlers
      }
    }).catch((err) => {
      // Inform the user about the payment provider load failure
      console.warn('Stripe load failed:', err.message);
      alert('Payment provider failed to load. Please disable tracking protection or try another browser.');
    });
  };
  const handleProInvite = () => setShowInviteForm(true);

  // Modal content
  return (
    <div className={styles.upgradeModal}>
      <div className={styles.upgradeModalOverlay}>
        <div className={styles.upgradeModal} ref={modalRef}>
          <h2 className={styles.upgradeHeader}>Upgrade your plan</h2>
          <div className={styles.upgradeSubheader}>Unlock more drafts, validators, and premium features.</div>
          <div className="mb-md font-medium">Current tier: <span>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</span></div>
          <div className="flex flex-wrap justify-center gap-lg">
            {/* Starter Tier Card */}
            {(currentTier === 'free') && (
              <div className={styles.upgradeTierCard}>
                <h3>Starter</h3>
                <ul>
                  <li>5 drafts per month</li>
                  <li>Downloads enabled</li>
                  <li>Validator runs included</li>
                </ul>
                <button className={styles.upgradeCTA} onClick={handleStarterUpgrade}>Upgrade to Starter</button>
              </div>
            )}
            {/* Pro Tier Card */}
            {(currentTier === 'free' || currentTier === 'starter') && !showInviteForm && (
              <div className={styles.upgradeTierCard}>
                <h3>Pro <span className="text-sm text-muted">(invite-only)</span></h3>
                <ul>
                  <li>Unlimited drafts</li>
                  <li>Unlimited validator runs</li>
                  <li>Full memory access</li>
                </ul>
                <button className={styles.upgradeCTA} onClick={handleProInvite}>Request Access</button>
                <div className="text-sm text-muted mt-xs">Pro access is currently invite-only.</div>
              </div>
            )}
            {/* Invite Request Form */}
            {showInviteForm && (
              <div className={styles.upgradeTierCard}>
                <InviteRequestForm tier="pro" user={user} onClose={onClose} />
              </div>
            )}
          </div>
          <button className={styles.upgradeCloseButton + ' mt-lg'} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
