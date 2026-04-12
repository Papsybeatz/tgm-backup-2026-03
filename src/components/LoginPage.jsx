import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SkinToggle from './SkinToggle';
import { useSkin } from '../hooks/useSkin.jsx';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { t } = useTranslation();
  const { skin } = useSkin();

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
      
      setTimeout(() => {
        let destination = '/dashboard/free';
        if (data.tier === 'starter') destination = '/dashboard/starter';
        else if (data.tier === 'pro') destination = '/dashboard/pro';
        else if (data.tier === 'agency_starter') destination = '/dashboard/agency-starter';
        else if (data.tier === 'agency_unlimited') destination = '/dashboard/agency-unlimited';
        else if (data.tier === 'lifetime') destination = '/dashboard/lifetime';
        navigate(destination);
      }, 500);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Login failed.');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: skin === 'futuristic' ? 'rgba(255, 255, 255, 0.05)' : '#fff',
    border: `1px solid ${skin === 'futuristic' ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb'}`,
    borderRadius: 10,
    color: skin === 'futuristic' ? '#e5e7eb' : '#111',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    display: 'block',
    color: skin === 'futuristic' ? 'rgba(255, 255, 255, 0.8)' : '#374151',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 8,
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: skin === 'futuristic' 
        ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)'
        : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #f9fafb 100%)',
      padding: 20,
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', left: 20, top: 20, display: 'flex', gap: 8 }}>
        <Link to="/" style={{
          padding: '8px 16px',
          borderRadius: 8,
          background: 'transparent',
          border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
          color: skin === 'futuristic' ? '#e5e7eb' : '#374151',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none'
        }}>Home</Link>
      </div>
      <div style={{ position: 'absolute', right: 20, top: 20 }}>
        <SkinToggle />
      </div>

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: skin === 'futuristic' 
          ? 'rgba(20, 20, 30, 0.8)' 
          : '#fff',
        backdropFilter: skin === 'futuristic' ? 'blur(20px)' : 'none',
        border: `1px solid ${skin === 'futuristic' ? 'rgba(0, 240, 255, 0.15)' : '#e5e7eb'}`,
        borderRadius: 20,
        padding: 40,
        boxShadow: skin === 'futuristic'
          ? '0 0 40px rgba(0, 240, 255, 0.1)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24,
            fontWeight: 700,
            color: 'white'
          }}>G</div>
          <h1 style={{
            color: skin === 'futuristic' ? '#fff' : '#111',
            fontSize: 28,
            fontWeight: 700,
            margin: 0
          }}>Welcome Back</h1>
          <p style={{
            color: skin === 'futuristic' ? 'rgba(255,255,255,0.6)' : '#6b7280',
            fontSize: 15,
            marginTop: 8
          }}>Sign in to continue to your workspace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              required
              disabled={status === 'loading'}
              placeholder="you@example.com"
            />
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
              disabled={status === 'loading'}
              placeholder="••••••••"
            />
          </div>

          {status === 'error' && (
            <div style={{
              background: skin === 'futuristic' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
              border: `1px solid ${skin === 'futuristic' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              borderRadius: 10,
              padding: '12px 16px',
              color: '#ef4444',
              fontSize: 14,
              marginBottom: 20
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: 14,
              background: skin === 'futuristic'
                ? 'linear-gradient(135deg, #00f0ff 0%, #0080ff 100%)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 12,
              color: skin === 'futuristic' ? '#000' : '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: skin === 'futuristic' 
                ? '0 0 20px rgba(0, 240, 255, 0.3)' 
                : '0 4px 14px rgba(59, 130, 246, 0.4)',
            }}
          >
            {status === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: 24,
          color: skin === 'futuristic' ? 'rgba(255,255,255,0.6)' : '#6b7280',
          fontSize: 14
        }}>
          Don't have an account?{' '}
          <Link 
            to="/signup"
            style={{
              color: skin === 'futuristic' ? '#00f0ff' : '#3b82f6',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Sign up
          </Link>
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 16,
          color: skin === 'futuristic' ? 'rgba(255,255,255,0.4)' : '#9ca3af',
          fontSize: 13
        }}>
          <span>✓ No credit card required</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;