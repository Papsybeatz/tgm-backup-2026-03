// InviteRequestForm.jsx
// Form for requesting Pro/Agency invite access
import React, { useState } from 'react';
import styles from './LandingPage.module.css';

export default function InviteRequestForm({ tier, user, onClose }) {
  const [email, setEmail] = useState(user?.email || '');
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
      // This posted to '/request-invite', which the SPA catch-all answered with
      // 405 — so no request ever reached the backend. The API is mounted under
      // /api/invite, and Vercel proxies /api/* to it.
      const res = await fetch('/api/invite/request-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: user?.name || '', tier }),
      });
      // Check the body, not just the status: a 200 that is not a real success is
      // exactly how a silent failure gets shown to the user as "submitted".
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'Network error');
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
