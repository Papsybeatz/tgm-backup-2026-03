import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | duplicate
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
    const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Signup successful!');
        setTimeout(() => {
          navigate('/dashboard/free');
        }, 700);
      } else if (res.status === 409) {
        setStatus('duplicate');
        setMessage('Email already registered.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Signup failed.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }}>
      <h1>{t('signup')}</h1>
      <p>Start with 1 draft per month and basic validator access.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}
            required
            disabled={status === 'loading'}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}
            required
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: '0.75rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Submitting...' : 'Continue'}
        </button>
      </form>
      {status === 'success' && (
        <div style={{ color: 'green', marginTop: 16 }}>{message}</div>
      )}
      {status === 'duplicate' && (
        <div style={{ color: 'red', marginTop: 16 }}>
          {message}
          <button
            style={{ marginTop: 12, padding: '0.5rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, display: 'block' }}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: 'red', marginTop: 16 }}>{message}</div>
      )}
    </div>
  );
}

export default SignupPage;
