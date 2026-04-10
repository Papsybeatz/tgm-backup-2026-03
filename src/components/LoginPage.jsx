import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    if (!email || !password) {
      setStatus('error');
      setMessage('Please enter email and password.');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }
      const data = await res.json();
      const userObj = { email: data.email, tier: data.tier };
      // Always set user in context and localStorage
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', data.token);
      setStatus('success');
      setMessage(t('login') + ' successful!');
      setTimeout(() => {
        // Debug log: print tier and destination
        let destination = '/dashboard/free';
        if (data.tier === 'starter') {
          destination = '/dashboard/starter';
        } else if (data.tier === 'pro') {
          destination = '/dashboard/pro';
        } else if (data.tier === 'agency_starter' || data.tier === 'agency') {
          destination = '/dashboard/agency';
        }
        console.log('[LoginPage] Login tier:', data.tier, 'Navigating to:', destination);
        navigate(destination);
      }, 700);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Login failed.');
    }
  };

  // Optional: Add a logout handler for completeness
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }} data-testid="login-page-root">
      <h1>{t('login')}</h1>
      <form onSubmit={handleSubmit} data-testid="login-form">
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
            data-testid="login-email"
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
            data-testid="login-password"
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: '0.75rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}
          disabled={status === 'loading'}
          data-testid="login-submit"
        >
          {status === 'loading' ? 'Logging in…' : 'Login'}
        </button>
      </form>
      {status === 'success' && (
        <div style={{ color: 'green', marginTop: 16 }}>{message}</div>
      )}
      {status === 'error' && (
        <div style={{ color: 'red', marginTop: 16 }}>{message}</div>
      )}
    </div>
  );
};

export default LoginPage;
