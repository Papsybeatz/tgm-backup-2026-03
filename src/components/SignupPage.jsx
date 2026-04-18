import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!form.email || !form.password || !form.confirmPassword) {
      setStatus('error');
      setMessage('Please fill in all fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Signup failed');
      }
      const data = await res.json();
      const userObj = { email: form.email, tier: data.tier || 'free' };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', data.token);
      setStatus('success');
      setMessage('Account created! Redirecting…');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Signup failed. Please try again.');
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid var(--tgm-border)',
    borderRadius: 'var(--tgm-radius-md)',
    fontSize: 15, color: 'var(--tgm-text)',
    background: 'var(--tgm-surface)',
    outline: 'none', transition: 'border-color .2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>
      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '48px 24px 56px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'var(--tgm-navy)'
          }}>GM</div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.3px' }}>GrantsMaster</span>
        </div>
        <p style={{ color: 'var(--tgm-gold-light)', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          🏆 Award-Winning Grant Writing Platform
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2 }}>
          Create Your Account
        </h1>
        <p style={{ fontSize: 17, opacity: .75, margin: 0 }}>
          Start drafting funder-ready proposals in minutes
        </p>
      </div>

      {/* Form */}
      <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--tgm-surface)',
          borderRadius: 'var(--tgm-radius-xl)',
          border: '1px solid var(--tgm-border)',
          boxShadow: 'var(--tgm-shadow-lg)',
          padding: '40px 36px',
        }}>
          {status === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 'var(--tgm-radius-md)', padding: '12px 16px',
              color: 'var(--tgm-error)', fontSize: 14, marginBottom: 24
            }}>{message}</div>
          )}
          {status === 'success' && (
            <div style={{
              background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 'var(--tgm-radius-md)', padding: '12px 16px',
              color: 'var(--tgm-success)', fontSize: 14, marginBottom: 24
            }}>{message}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Enter your email"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Create a password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)', marginBottom: 8 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--tgm-gold)',
                border: 'none', borderRadius: 'var(--tgm-radius-md)',
                color: 'var(--tgm-navy)', fontSize: 16, fontWeight: 700,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                boxShadow: 'var(--tgm-shadow-md)',
                transition: 'opacity .2s',
              }}
            >
              {status === 'loading' ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'var(--tgm-muted)', fontSize: 14, margin: '0 0 10px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--tgm-blue)', fontWeight: 700 }}>Sign in</Link>
            </p>
            <a href="/reset-password" style={{ color: 'var(--tgm-blue)', fontWeight: 600, fontSize: 14 }}>
              Forgot your password?
            </a>
            <div style={{ marginTop: 16, color: 'var(--tgm-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
