import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from './UserContext';

export default function ContactPage() {
  const { user } = useUser();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user?.userId })
      });
    } catch {}
    setStatus('sent');
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid var(--tgm-border)',
    borderRadius: 'var(--tgm-radius-md)',
    fontSize: 15, color: 'var(--tgm-text)',
    background: 'var(--tgm-surface)',
    outline: 'none', transition: 'border-color .2s',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: 14, fontWeight: 600,
    color: 'var(--tgm-text)', marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '56px 24px 64px', color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, color: 'var(--tgm-navy)',
              }}>GM</div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>GrantsMaster</span>
            </Link>
            <Link to="/pricing" style={{
              padding: '8px 18px', borderRadius: 'var(--tgm-radius-md)',
              background: 'var(--tgm-gold)', color: 'var(--tgm-navy)',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>View Pricing</Link>
          </div>

          {/* Heading */}
          <div style={{ maxWidth: 560 }}>
            <p style={{ color: 'var(--tgm-gold-light)', fontWeight: 600, fontSize: 13, marginBottom: 12, letterSpacing: '.5px', textTransform: 'uppercase' }}>
              Get in Touch
            </p>
            <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.15 }}>
              We'd love to hear from you
            </h1>
            <p style={{ fontSize: 17, opacity: .75, margin: 0, lineHeight: 1.6 }}>
              Questions about pricing, features, or partnerships? Our team responds within 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 48, alignItems: 'start' }}>

          {/* Left — contact info */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 24px' }}>
              Contact Information
            </h2>

            {[
              { icon: '✉️', label: 'Email', value: 'support@grantsmaster.com' },
              { icon: '⏱️', label: 'Response time', value: 'Within 24 hours' },
              { icon: '🌍', label: 'Available', value: 'Mon – Fri, 9am – 6pm EST' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                marginBottom: 24, padding: '16px 20px',
                background: 'var(--tgm-surface)',
                borderRadius: 'var(--tgm-radius-md)',
                border: '1px solid var(--tgm-border)',
                boxShadow: 'var(--tgm-shadow-sm)',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--tgm-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tgm-navy)' }}>{value}</p>
                </div>
              </div>
            ))}

            {/* Gold divider card */}
            <div style={{
              marginTop: 8, padding: '20px 24px',
              background: 'linear-gradient(135deg, var(--tgm-navy), var(--tgm-blue))',
              borderRadius: 'var(--tgm-radius-lg)',
              border: '1px solid rgba(212,175,55,.3)',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--tgm-gold)' }}>
                🏆 Enterprise & Agency?
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                Need a custom plan, white-label, or dedicated support? Let's talk.
              </p>
              <Link to="/pricing" style={{
                display: 'inline-block', padding: '8px 18px',
                background: 'var(--tgm-gold)', color: 'var(--tgm-navy)',
                borderRadius: 'var(--tgm-radius-sm)', fontSize: 13, fontWeight: 700,
              }}>See Plans</Link>
            </div>
          </div>

          {/* Right — form */}
          <div style={{
            background: 'var(--tgm-surface)',
            borderRadius: 'var(--tgm-radius-xl)',
            border: '1px solid var(--tgm-border)',
            boxShadow: 'var(--tgm-shadow-lg)',
            padding: '40px 36px',
          }}>
            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'rgba(34,197,94,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>✓</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 8px' }}>
                  Message sent!
                </h3>
                <p style={{ color: 'var(--tgm-muted)', fontSize: 15, margin: '0 0 24px' }}>
                  We'll get back to you within 24 hours.
                </p>
                <button onClick={() => { setStatus('idle'); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  style={{
                    padding: '10px 24px', borderRadius: 'var(--tgm-radius-md)',
                    background: 'var(--tgm-gold)', border: 'none',
                    color: 'var(--tgm-navy)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}>Send another</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tgm-navy)', margin: '0 0 28px' }}>
                  Send us a message
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input type="text" value={form.name} required placeholder="Your name"
                        onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                        onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={form.email} required placeholder="you@example.com"
                        onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                        onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Subject</label>
                    <input type="text" value={form.subject} placeholder="How can we help?"
                      onChange={e => setForm({ ...form, subject: e.target.value })} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Message</label>
                    <textarea value={form.message} required rows={5} placeholder="Tell us more…"
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={e => e.target.style.borderColor = 'var(--tgm-gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--tgm-border)'} />
                  </div>
                  <button type="submit" disabled={status === 'loading'} style={{
                    width: '100%', padding: '14px',
                    background: 'var(--tgm-gold)', border: 'none',
                    borderRadius: 'var(--tgm-radius-md)',
                    color: 'var(--tgm-navy)', fontSize: 16, fontWeight: 700,
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: status === 'loading' ? 0.7 : 1,
                    boxShadow: 'var(--tgm-shadow-md)', transition: 'opacity .2s',
                  }}>
                    {status === 'loading' ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
