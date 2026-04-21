import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';
import { useSkin } from '../hooks/useSkin.jsx';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { skin } = useSkin();
  const isDark = skin === 'futuristic';
  
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
      const res = await fetch('/api/auth/signup', {
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
      setMessage('Account created! Redirecting...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#0a0a0f]' : 'bg-[#F7F9FB]'}`}>
      {/* HERO HEADER */}
      <section className={`py-16 px-6 shadow-lg ${
        isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] text-white'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
              isDark ? 'bg-[rgba(0,240,255,0.1)]' : 'bg-gradient-to-br from-[#D4AF37] to-[#E8D28C]'
            }`}>
              <span className={`font-bold ${isDark ? 'text-[#00f0ff]' : 'text-[#0A0F1A]'}`}>GM</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-white'}`}>GrantsMaster</h1>
          </div>

          {/* Award Tag */}
          <p className={`font-semibold mb-2 ${isDark ? 'text-[#00f0ff]' : 'text-[#E8D28C]'}`}>
            🏆 Award‑Winning Grant Writing Platform
          </p>

          <h2 className="text-4xl font-bold mb-2">Create Your Account</h2>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-[#E8D28C]'}`}>
            Start drafting funder‑ready proposals in minutes
          </p>
        </div>
      </section>

      {/* SIGNUP FORM */}
      <section className="py-20 px-6">
        <div className={`max-w-md mx-auto rounded-xl shadow-lg p-10 ${
          isDark ? 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)]' : 'bg-white border border-[#D4AF37]/40'
        }`}>
          
          {status === 'error' && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              isDark ? 'bg-red-900/20 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {message}
            </div>
          )}
          
          {status === 'success' && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              isDark ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-green-50 border border-green-200 text-green-600'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className={`block font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full p-4 rounded-lg border shadow-sm focus:ring-2 focus:ring-[#D4AF37] outline-none ${
                  isDark 
                    ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300'
                }`}
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label className={`block font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`w-full p-4 rounded-lg border shadow-sm focus:ring-2 focus:ring-[#D4AF37] outline-none ${
                  isDark 
                    ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300'
                }`}
                placeholder="Create a password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full p-4 rounded-lg border shadow-sm focus:ring-2 focus:ring-[#D4AF37] outline-none ${
                  isDark 
                    ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300'
                }`}
                placeholder="Re‑enter your password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className={`w-full py-4 rounded-lg font-semibold shadow transition ${
                status === 'loading' ? 'opacity-70 cursor-not-allowed' : ''
              } ${
                isDark 
                  ? 'bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-black hover:shadow-lg' 
                  : 'bg-[#003A8C] text-white hover:bg-[#002A66]'
              }`}
            >
              {status === 'loading' ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-[#003A8C] font-semibold hover:underline">
                Sign in
              </Link>
            </p>

            <p className="mt-3">
              <a href="/reset-password" className="text-[#003A8C] font-semibold hover:underline">
                Forgot your password?
              </a>
            </p>

            <div className="mt-4 text-gray-700 space-y-1">
              <p>✓ No credit card required</p>
              <p>✓ Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}