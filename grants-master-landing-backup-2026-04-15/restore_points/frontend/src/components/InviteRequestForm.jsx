// InviteRequestForm.jsx
// Form for requesting Pro/Agency invite access
import React, { useState } from 'react';
import styles from './LandingPage.module.css';

export default function InviteRequestForm({ tier, user, onClose }) {
  const [email, setEmail] = useState(user.email || '');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/.+@.+\..+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const res = await fetch('/request-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier }),
      });
      if (!res.ok) throw new Error('Network error');
      setSubmitted(true);
    } catch (err) {
      setError('Submission failed. Please try again later.');
    }
  };

  return (
    <div className={styles.inviteRequestForm}>
      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor="inviteEmail">Email:</label>
          <input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={styles.emailInput}
          />
          <button type="submit" className={styles.ctaButton}>
            {tier === 'pro' ? 'Request Pro Access' : 'Contact Sales'}
          </button>
          {error && <div className={styles.errorText}>{error}</div>}
        </form>
      ) : (
        <div className={styles.successText}>
          Your request has been submitted. We’ll be in touch soon.
        </div>
      )}
      <button className={styles.closeButton} onClick={onClose}>Close</button>
    </div>
  );
}
