// UpgradeModal.jsx
// Conversion-optimized modal for upgrade triggers
import React, { useState, useEffect, useRef } from 'react';
import InviteRequestForm from './InviteRequestForm';
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
    // Stripe checkout session logic (handled elsewhere)
    if (window.StripeCheckout) window.StripeCheckout();
    // ...existing upgrade logic
  };
  const handleProInvite = () => setShowInviteForm(true);

  // Modal content
  return (
    <div className={styles.upgradeModal}>
      <div className={styles.upgradeModalOverlay}>
        <div className={styles.upgradeModal} ref={modalRef}>
          <h2 className={styles.upgradeHeader}>Upgrade your plan</h2>
          <div className={styles.upgradeSubheader}>Unlock more drafts, validators, and premium features.</div>
          <div style={{ margin: '1rem 0', fontWeight: 500 }}>Current tier: <span>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</span></div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                <h3>Pro <span style={{ fontSize: '0.9em', color: '#888' }}>(invite-only)</span></h3>
                <ul>
                  <li>Unlimited drafts</li>
                  <li>Unlimited validator runs</li>
                  <li>Full memory access</li>
                </ul>
                <button className={styles.upgradeCTA} onClick={handleProInvite}>Request Access</button>
                <div style={{ fontSize: '0.85em', color: '#888', marginTop: '0.5rem' }}>Pro access is currently invite-only.</div>
              </div>
            )}
            {/* Invite Request Form */}
            {showInviteForm && (
              <div className={styles.upgradeTierCard}>
                <InviteRequestForm tier="pro" user={user} onClose={onClose} />
              </div>
            )}
          </div>
          <button className={styles.upgradeCloseButton} onClick={onClose} style={{ marginTop: '2rem' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
