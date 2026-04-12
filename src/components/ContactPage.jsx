import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSkin } from '../hooks/useSkin';
import { useUser } from './UserContext';

export default function ContactPage() {
  const { skin } = useSkin();
  const { user } = useUser();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user?.userId })
      });
    } catch {}
    setSent(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: skin === 'futuristic' ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)' : '#f7f9fb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          background: skin === 'futuristic' ? 'rgba(20, 20, 30, 0.8)' : '#fff',
          backdropFilter: 'blur(12px)',
          padding: '12px 24px'
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: skin === 'futuristic' ? '#fff' : '#111',
            textDecoration: 'none'
          }}
        >
          Home
        </Link>
        <Link
          to="/pricing"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: skin === 'futuristic' ? 'linear-gradient(135deg, #00f0ff, #0080ff)' : '#4f46e5',
            color: skin === 'futuristic' ? '#000' : '#fff',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          Pricing
        </Link>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: skin === 'futuristic' ? '#fff' : '#111',
            marginBottom: 8
          }}
        >
          Contact Us
        </h1>
        <p
          style={{
            color: skin === 'futuristic' ? 'rgba(255,255,255,0.6)' : '#6b7280',
            marginBottom: 24
          }}
        >
          We usually respond within 24 hours.
        </p>

        {sent ? (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: skin === 'futuristic' ? 'rgba(0,240,255,0.1)' : '#d4edda',
              border: `1px solid ${skin === 'futuristic' ? 'rgba(0,240,255,0.3)' : '#c3e6cb'}`
            }}
          >
            <p style={{ color: skin === 'futuristic' ? '#00f0ff' : '#155724', fontWeight: 500 }}>
              Message sent! We'll get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: skin === 'futuristic' ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                color: skin === 'futuristic' ? '#fff' : '#111',
                fontSize: 15,
                outline: 'none'
              }}
            />
            <input
              type="email"
              placeholder="Your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: skin === 'futuristic' ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                color: skin === 'futuristic' ? '#fff' : '#111',
                fontSize: 15,
                outline: 'none'
              }}
            />
            <textarea
              placeholder="How can we help?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              rows={5}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: skin === 'futuristic' ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                color: skin === 'futuristic' ? '#fff' : '#111',
                fontSize: 15,
                outline: 'none',
                resize: 'vertical'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 8,
                background: skin === 'futuristic' ? 'linear-gradient(135deg, #00f0ff, #0080ff)' : '#4f46e5',
                color: skin === 'futuristic' ? '#000' : '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}