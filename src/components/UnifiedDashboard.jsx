import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';
import { TIERS } from '../config/tiers';
import BillingPortalButton from './BillingPortalButton';
import DraftsList from './DraftsList';

function UserDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tgm_onboarded');
    setOpen(false);
    navigate('/');
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', borderRadius: 8,
        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg,#D4AF37,#E8D28C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#0A0F1A',
        }}>GM</div>
        <span>{user?.email}</span>
        <span style={{ fontSize: 10, opacity: .7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          minWidth: 200, borderRadius: 10,
          background: '#fff', border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Signed in as</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '2px 0 0' }}>{user?.email}</p>
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} style={{
            display: 'block', padding: '10px 16px', fontSize: 14,
            color: '#1e293b', textDecoration: 'none',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >Dashboard</Link>
          <Link to="/pricing" onClick={() => setOpen(false)} style={{
            display: 'block', padding: '10px 16px', fontSize: 14,
            color: '#1e293b', textDecoration: 'none',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >Upgrade Plan</Link>
          <div style={{ borderTop: '1px solid #f1f5f9' }} />
          <button onClick={logout} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '10px 16px', fontSize: 14, color: '#ef4444',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >Sign out</button>
        </div>
      )}
    </div>
  );
}

const FEATURE_MAP = {
  aiDraft:     ['starter','pro','agency_starter','agency_unlimited','lifetime'],
  compliance:  ['pro','agency_starter','agency_unlimited','lifetime'],
  workspace:   ['pro','agency_starter','agency_unlimited','lifetime'],
  reviewer:    ['agency_starter','agency_unlimited','lifetime'],
  funderMatch: ['agency_unlimited','lifetime'],
};

const TIER_META = {
  free:             { label: 'Free',             color: '#475569', bg: '#F1F5F9' },
  starter:          { label: 'Starter',          color: '#1D4ED8', bg: '#EFF6FF' },
  pro:              { label: 'Pro',              color: '#92400E', bg: '#FEF9C3' },
  agency_starter:   { label: 'Agency Starter',   color: '#166534', bg: '#F0FDF4' },
  agency_unlimited: { label: 'Agency Unlimited', color: '#065F46', bg: '#ECFDF5' },
  lifetime:         { label: 'Lifetime',         color: '#7E22CE', bg: '#FDF4FF' },
};

export default function UnifiedDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useUser() || {};
  const tier = user?.tier || 'free';
  const tierConfig = TIERS[tier] || TIERS.free;
  const meta = TIER_META[tier] || TIER_META.free;

  const unlocked = (key) => FEATURE_MAP[key]?.includes(tier);

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">

      {/* NAV */}
      <header className="bg-gradient-to-r from-[#0A0F1A] to-[#003A8C] text-white py-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center shadow-md">
              <span className="text-[#0A0F1A] font-bold text-sm">GM</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">GrantsMaster</h1>
          </Link>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[#E8D28C] font-semibold text-sm">
              {meta.label.toUpperCase()} ACCESS
            </span>
            <UserDropdown user={user} />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#E8D28C] text-xs font-bold uppercase tracking-widest mb-3">Welcome back</p>
          <h2 className="text-3xl font-bold mb-2">Your Multi-Workspace Dashboard</h2>
          <p className="text-[#E8D28C] text-lg mb-8">
            Manage all your grants, drafts, and collaboration in one unified hub.
          </p>
          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Plan',       value: tierConfig.name },
              { label: 'Drafts',     value: tierConfig.limits?.drafts === Infinity ? 'Unlimited' : tierConfig.limits?.drafts ?? 0 },

              { label: 'Team Seats', value: tierConfig.limits?.teamSeats === Infinity ? 'Unlimited' : tierConfig.limits?.teamSeats === 0 ? '—' : tierConfig.limits?.teamSeats },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 border border-white/15 rounded-xl px-5 py-3 min-w-[100px]">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
                <p className="text-lg font-bold text-[#D4AF37]">{value}</p>
              </div>
            ))}
            {tier === 'free' && (
              <Link to="/pricing" className="flex items-center gap-2 bg-[#D4AF37] rounded-xl px-5 py-3 text-[#0A0F1A] font-bold text-sm no-underline self-center ml-2">
                ⚡ Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* DRAFTS — primary action area */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <DraftsList />
      </section>

      {/* FEATURE GRID */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#003A8C]">Platform Features</h3>
          <Link to="/pricing" className="text-sm font-semibold text-[#003A8C] border border-[#E2E8F0] px-4 py-1.5 rounded-lg no-underline hover:border-[#D4AF37] transition">
            View all plans →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'aiDraft',     label: 'AI Grant Drafting',          icon: '✍️', desc: 'Generate funder-ready proposals in minutes.' },
            { key: 'compliance',  label: 'Compliance Validator',        icon: '✅', desc: 'Auto-check drafts against funder requirements.' },
            { key: 'workspace',   label: 'Team Workspace',              icon: '👥', desc: 'Collaborate with your team in real time.' },
            { key: 'reviewer',    label: 'AI Reviewer Engine',          icon: '🔍', desc: 'Simulate reviewer feedback before submission.' },
            { key: 'funderMatch', label: 'Funder Match Intelligence',   icon: '🎯', desc: 'AI-curated funder recommendations for your mission.' },
          ].map((f) => (
            <div key={f.key} className={`p-6 rounded-xl shadow-md border transition
              ${unlocked(f.key)
                ? 'bg-white border-[#D4AF37]/40 hover:shadow-lg hover:border-[#D4AF37]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
                  ${unlocked(f.key) ? 'bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30' : 'bg-[#F1F5F9]'}`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-[#003A8C] flex items-center gap-2">
                  {f.label}
                  {unlocked(f.key)
                    ? <span className="text-[#D4AF37] text-sm">✓</span>
                    : <span className="text-gray-400 text-sm">🔒</span>}
                </h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{f.desc}</p>
              {unlocked(f.key)
                ? <button onClick={() => navigate(`/workspace/${f.key}`)}
                    className="text-sm font-bold text-[#003A8C] hover:text-[#D4AF37] transition">
                    Open →
                  </button>
                : <Link to="/pricing" className="text-sm font-bold text-gray-400 hover:text-[#003A8C] transition no-underline">
                    Upgrade to unlock →
                  </Link>}
            </div>
          ))}
        </div>
      </section>

      {/* AI ENGINE PANEL */}
      <section className="py-20 bg-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Powered by the GrantsMaster AI Engine</p>
        <h2 className="text-3xl font-bold text-[#D4AF37] mb-4">Your Smartest Grant Writing Partner</h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-10">
          Generate drafts, refine clarity, and align with funder requirements using our award-winning AI.
        </p>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 text-left">
          {[
            { stat: '10x', label: 'Faster than manual drafting' },
            { stat: '94%', label: 'Funder alignment score' },
            { stat: '$2M+', label: 'Grants won by users' },
          ].map(({ stat, label }) => (
            <div key={stat} className="bg-white/10 rounded-xl p-6 border border-white/10">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">{stat}</p>
              <p className="text-gray-300 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>



      {/* BILLING & SUBSCRIPTION */}
      <section className="py-12 max-w-6xl mx-auto px-6">
        <h3 className="text-lg font-bold text-[#0A0F1A] mb-4">Billing & Subscription</h3>
        <BillingPortalButton />
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Unlock the full GrantsMaster experience</p>
        <h2 className="text-4xl font-bold mb-6">Ready to elevate your grant writing?</h2>
        <Link to="/pricing"
          className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition no-underline">
          Explore Full Access
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0F1A] text-gray-500 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs">© {new Date().getFullYear()} GrantsMaster · All rights reserved</p>
          <div className="flex gap-6 text-xs">
            <Link to="/pricing" className="hover:text-[#D4AF37] transition no-underline text-gray-500">Pricing</Link>
            <Link to="/contact" className="hover:text-[#D4AF37] transition no-underline text-gray-500">Support</Link>
            <Link to="/privacy" className="hover:text-[#D4AF37] transition no-underline text-gray-500">Privacy</Link>
            <Link to="/terms"   className="hover:text-[#D4AF37] transition no-underline text-gray-500">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
