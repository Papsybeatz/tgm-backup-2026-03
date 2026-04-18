import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
    }}>
      {/* Left panel – branding */}
      <div style={{
        flex: 1,
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        color: '#fff',
      }} className="hidden md:flex flex-col justify-center">
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, fontSize: 22, fontWeight: 800, color: 'var(--tgm-navy)'
        }}>GM</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
          GrantsMaster
        </h1>
        <p style={{ fontSize: 18, opacity: .75, margin: '0 0 40px', lineHeight: 1.6 }}>
          Award-winning grant writing platform trusted by nonprofits and agencies worldwide.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['AI-powered proposal drafting', 'Funder matching engine', 'Scoring & analytics'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, opacity: .85 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(212,175,55,.25)', color: 'var(--tgm-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0
              }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 32px',
        background: 'var(--tgm-bg)',
        borderRadius: '0 0 0 0',
      }}>
        {/* Back link */}
        <div style={{ marginBottom: 32 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--tgm-muted)',
            padding: '6px 12px', borderRadius: 'var(--tgm-radius-sm)',
            border: '1px solid var(--tgm-border)',
          }}>← Home</Link>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 15, color: 'var(--tgm-muted)', margin: 0 }}>
            Sign in to continue to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} data-testid="login-form">
          <div style={{ marginBottom: 20 }} data-testid="login-page-root">
            <label style={{
              display: 'block', fontSize: 14, fontWeight: 600,
              color: 'var(--tgm-text)', marginBottom: 8
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={status === 'loading'}
              placeholder="you@example.com"
              data-testid="login-email"
              style={{
                width: '100%', padding: '13px 16px',
                border: '1.5px solid var(--tgm-border)',
                borderRadius: 'var(--tgm-radius-md)',
                fontSize: 15, color: 'var(--tgm-text)',
                background: 'var(--tgm-surface)',
                outline: 'none', transition: 'border-color .2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'}
            />
          </div>

          <div style={{ marginBottom: 24 }} data-testid="login-password-container">
            <label style={{
              display: 'block', fontSize: 14, fontWeight: 600,
              color: 'var(--tgm-text)', marginBottom: 8
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={status === 'loading'}
              placeholder="••••••••"
              data-testid="login-password"
              style={{
                width: '100%', padding: '13px 16px',
                border: '1.5px solid var(--tgm-border)',
                borderRadius: 'var(--tgm-radius-md)',
                fontSize: 15, color: 'var(--tgm-text)',
                background: 'var(--tgm-surface)',
                outline: 'none', transition: 'border-color .2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'}
            />
          </div>

          {status === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,.08)',
              border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 'var(--tgm-radius-md)',
              padding: '12px 16px',
              color: 'var(--tgm-error)',
              fontSize: 14,
              marginBottom: 20
            }}>{message}</div>
          )}

          {status === 'success' && (
            <div style={{
              background: 'rgba(34,197,94,.08)',
              border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 'var(--tgm-radius-md)',
              padding: '12px 16px',
              color: 'var(--tgm-success)',
              fontSize: 14,
              marginBottom: 20
            }}>{message}</div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            data-testid="login-submit"
            style={{
              width: '100%', padding: '14px',
              background: 'var(--tgm-gold)',
              border: 'none',
              borderRadius: 'var(--tgm-radius-md)',
              color: 'var(--tgm-navy)',
              fontSize: 16, fontWeight: 700,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              boxShadow: 'var(--tgm-shadow-md)',
              transition: 'opacity .2s, box-shadow .2s',
            }}
          >
            {status === 'loading' ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--tgm-muted)', fontSize: 14 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--tgm-blue)', fontWeight: 700 }}>Sign up</Link>
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, marginTop: 16, color: 'var(--tgm-muted)', fontSize: 13
        }}>
          <span>✓ No credit card required</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
