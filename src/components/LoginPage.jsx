import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';

async function safeJson(res) {
  const text = await res.text();
  if (!text) throw new Error('Empty response — backend may be offline. Please try again.');
  try { return JSON.parse(text); } catch { throw new Error(text || 'Server error'); }
}

const EyeIcon = ({ open }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const STATS = [
  { value: '10x', label: 'Faster than manual drafting' },
  { value: '94%', label: 'Funder alignment score' },
  { value: '$2M+', label: 'Grants won by users' },
];

const FEATURES = [
  'AI-powered proposal drafting',
  'Funder matching engine',
  'Scoring & compliance checks',
  'Team collaboration tools',
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    if (!email || !password) {
      setStatus('error'); setMessage('Please enter email and password.'); return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || 'Login failed');
      const userObj = { email: data.email, tier: data.tier };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', data.token);
      setStatus('success');
      setMessage('Login successful!');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Login failed.');
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
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Left branding panel ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(160deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
        color: '#fff',
        minWidth: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'var(--tgm-navy)', flexShrink: 0,
          }}>GM</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px' }}>GrantsMaster</span>
        </div>

        {/* Main copy */}
        <div>
          <p style={{ color: 'var(--tgm-gold-light)', fontWeight: 600, fontSize: 13, marginBottom: 16, letterSpacing: '.5px', textTransform: 'uppercase' }}>
            🏆 Award-Winning Platform
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: '0 0 20px' }}>
            Win more grants with AI-powered writing
          </h2>
          <p style={{ fontSize: 16, opacity: .75, lineHeight: 1.7, margin: '0 0 40px' }}>
            Trusted by nonprofits, agencies, and consultants to draft funder-ready proposals in minutes.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(212,175,55,.2)', border: '1px solid rgba(212,175,55,.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'var(--tgm-gold)',
                }}>✓</div>
                <span style={{ fontSize: 15, opacity: .9 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {STATS.map(({ value, label }) => (
              <div key={value} style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 12, padding: '16px 12px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--tgm-gold)', margin: '0 0 4px' }}>{value}</p>
                <p style={{ fontSize: 11, opacity: .65, margin: 0, lineHeight: 1.4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{
          background: 'rgba(255,255,255,.07)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 14, padding: '20px 24px',
        }}>
          <p style={{ fontSize: 14, fontStyle: 'italic', opacity: .85, margin: '0 0 10px', lineHeight: 1.6 }}>
            "We won our first grant in 3 weeks using GrantsMaster. The AI engine writes better than our consultants."
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tgm-gold)', margin: 0 }}>
            — Nonprofit Director, Atlanta
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--tgm-bg)',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 36 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--tgm-muted)',
            padding: '6px 12px', borderRadius: 'var(--tgm-radius-sm)',
            border: '1px solid var(--tgm-border)',
          }}>← Home</Link>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>Welcome back</h2>
          <p style={{ fontSize: 15, color: 'var(--tgm-muted)', margin: 0 }}>Sign in to continue to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} data-testid="login-form">
          <div style={{ marginBottom: 20 }} data-testid="login-page-root">
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)', marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required disabled={status === 'loading'} placeholder="you@example.com"
              data-testid="login-email" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
          </div>

          <div style={{ marginBottom: 24 }} data-testid="login-password-container">
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)', marginBottom: 8 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required disabled={status === 'loading'} placeholder="••••••••"
                data-testid="login-password" style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--tgm-muted)', display: 'flex', alignItems: 'center',
                }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {status === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 'var(--tgm-radius-md)', padding: '12px 16px',
              color: 'var(--tgm-error)', fontSize: 14, marginBottom: 20
            }}>{message}</div>
          )}
          {status === 'success' && (
            <div style={{
              background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 'var(--tgm-radius-md)', padding: '12px 16px',
              color: 'var(--tgm-success)', fontSize: 14, marginBottom: 20
            }}>{message}</div>
          )}

          <button type="submit" disabled={status === 'loading'} data-testid="login-submit" style={{
            width: '100%', padding: '14px',
            background: 'var(--tgm-gold)', border: 'none',
            borderRadius: 'var(--tgm-radius-md)',
            color: 'var(--tgm-navy)', fontSize: 16, fontWeight: 700,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
            boxShadow: 'var(--tgm-shadow-md)', transition: 'opacity .2s',
          }}>
            {status === 'loading' ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--tgm-muted)', fontSize: 14 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--tgm-blue)', fontWeight: 700 }}>Sign up free</Link>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, color: 'var(--tgm-muted)', fontSize: 13 }}>
          <span>✓ No credit card required</span>
          <span>✓ Cancel anytime</span>
        </div>

        {/* Trust badges */}
        <div style={{
          marginTop: 40, paddingTop: 24,
          borderTop: '1px solid var(--tgm-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {[
            { icon: '🔒', title: 'Secure login', desc: 'SSL encrypted' },
            { icon: '🏆', title: 'Award-winning', desc: 'Trusted platform' },
            { icon: '⚡', title: 'Instant access', desc: 'No waiting' },
            { icon: '🌍', title: '24/7 support', desc: 'Always available' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              background: 'var(--tgm-surface)',
              borderRadius: 'var(--tgm-radius-md)',
              border: '1px solid var(--tgm-border)',
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tgm-navy)' }}>{title}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
