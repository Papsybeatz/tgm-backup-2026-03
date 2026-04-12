import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserContext';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // First create the account
      const signupRes = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, org })
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        setStatus('error');
        setMessage(signupData.message || 'Signup failed');
        return;
      }

      // Then attempt to log the user in
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        setStatus('success');
        const userObj = {
          email: data.email,
          tier: data.tier || 'free',
          name: name || null,
          org: org || null
        };
        setUser(userObj);
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('token', data.token);

        setTimeout(() => {
          navigate('/onboarding');
        }, 500);
      } else {
        setStatus('error');
        setMessage(data.message || 'Login failed after signup');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: '2rem'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: 'white'
          }}>G</div>
          <span style={{ color: 'white', fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>
            GrantsMaster
          </span>
        </div>

        <h2 style={{
          color: 'white',
          fontSize: 28,
          fontWeight: 600,
          marginBottom: '0.5rem'
        }}>Create your account</h2>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 15,
          marginBottom: '2rem'
        }}>
          Start writing winning grants in minutes.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: '0.5rem'
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                color: 'white',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              required
              disabled={status === 'loading'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
            <div>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: '0.5rem'
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none'
                }}
                required
                disabled={status === 'loading'}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: '0.5rem'
              }}>Confirm</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none'
                }}
                required
                disabled={status === 'loading'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: '0.5rem'
            }}>Organization (optional)</label>
            <input
              type="text"
              value={org}
              onChange={e => setOrg(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                color: 'white',
                fontSize: 15,
                outline: 'none'
              }}
              disabled={status === 'loading'}
            />
          </div>

          {status === 'error' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              color: '#ef4444',
              fontSize: 14,
              marginBottom: '1rem'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '1rem',
              background: status === 'loading' 
                ? 'rgba(59, 130, 246, 0.5)' 
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            {status === 'loading' ? 'Creating account...' : 'Get Started Free'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 14
        }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Sign in
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: '1.5rem',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: 13
        }}>
          <span>✓ No credit card required</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;