import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from './UserContext';

async function safeJson(res) {
  const text = await res.text();
  if (!text) throw new Error('Empty response from server');
  try { return JSON.parse(text); } catch { throw new Error(text || 'Server error'); }
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid var(--tgm-border)',
    borderRadius: 'var(--tgm-radius-md)',
    fontSize: 15,
    color: 'var(--tgm-text)',
    background: 'var(--tgm-surface)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const requestReset = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus('error');
      setMessage('Enter your email address.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || 'Could not send reset link.');
      setStatus('success');
      setMessage(data.message || 'If an account exists, a reset link has been sent.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Could not send reset link.');
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!password || password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || 'Could not reset password.');
      const userObj = { email: data.email, tier: data.tier || 'free' };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', data.token);
      localStorage.setItem('tgm_onboarded', '1');
      setStatus('success');
      setMessage('Password reset. Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard', { replace: true }), 700);
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Could not reset password.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)', padding: '56px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'var(--tgm-surface)',
        border: '1px solid var(--tgm-border)',
        borderRadius: 'var(--tgm-radius-xl)',
        boxShadow: 'var(--tgm-shadow-lg)',
        padding: '36px 32px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: 'var(--tgm-navy)',
            marginBottom: 16,
          }}>GM</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
            {token ? 'Set a new password' : 'Reset your password'}
          </h1>
          <p style={{ color: 'var(--tgm-muted)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            {token
              ? 'Choose a new password for your TGM account.'
              : 'Enter your account email and we will send you a secure reset link.'}
          </p>
        </div>

        <form onSubmit={token ? resetPassword : requestReset}>
          {!token ? (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--tgm-text)', marginBottom: 8 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                autoComplete="email"
              />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--tgm-text)', marginBottom: 8 }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--tgm-text)', marginBottom: 8 }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {message && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: status === 'error' ? '#FEF2F2' : '#F0FDF4',
              color: status === 'error' ? '#991B1B' : '#166534',
              fontSize: 14,
              marginBottom: 18,
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '14px 18px',
              border: 'none',
              borderRadius: 'var(--tgm-radius-md)',
              background: status === 'loading' ? '#94A3B8' : 'var(--tgm-blue)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'loading' ? 'Please wait...' : token ? 'Reset Password' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: 14, color: 'var(--tgm-muted)' }}>
          Remembered it? <Link to="/login" style={{ color: 'var(--tgm-blue)', fontWeight: 800 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
