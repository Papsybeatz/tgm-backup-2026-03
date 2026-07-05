import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserContext';
import { AnimatePresence, motion } from 'framer-motion';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

function LangSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'en';
  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {LANGUAGES.map(l => (
        <button key={l.code} onClick={() => change(l.code)} style={{
          padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          border: current === l.code ? 'none' : '1px solid rgba(255,255,255,0.25)',
          background: current === l.code ? '#D4AF37' : 'transparent',
          color: current === l.code ? '#0A0F1A' : 'rgba(255,255,255,0.7)',
          cursor: 'pointer', transition: 'all .15s',
        }}>{l.label}</button>
      ))}
    </div>
  );
}

const TIER_BADGE_DROPDOWN = {
  free:             { label: 'Free',             bg: 'rgba(255,255,255,0.1)',    color: 'rgba(255,255,255,0.55)' },
  starter:          { label: 'Starter',          bg: 'rgba(0,58,140,0.35)',      color: '#93C5FD' },
  pro:              { label: 'Pro',              bg: 'rgba(212,175,55,0.2)',     color: '#D4AF37' },
  agency_starter:   { label: 'Agency',           bg: 'rgba(22,101,52,0.3)',      color: '#6EE7B7' },
  agency_unlimited: { label: 'Agency+',          bg: 'rgba(6,95,70,0.35)',       color: '#34D399' },
  lifetime:         { label: 'Lifetime ✦',       bg: 'rgba(126,34,206,0.3)',     color: '#C4B5FD' },
};

function UserDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { setUser } = useUser();

  const tier = user?.tier || 'free';
  const tierBadge = TIER_BADGE_DROPDOWN[tier] || TIER_BADGE_DROPDOWN.free;
  const initials = (user?.email || 'GM').slice(0, 2).toUpperCase();

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

  const NAV_ITEMS = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Drafts',  to: '/dashboard' },
    ...(tier === 'free' ? [{ label: 'Upgrade Plan', to: '/plans', highlight: true }] : []),
    { label: 'Billing',   to: '/billing' },
  ];

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 12px 5px 6px', borderRadius: 10,
        background: open ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.1)',
        border: `1px solid ${open ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.18)'}`,
        color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
        transition: 'all .15s',
      }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg,#D4AF37,#E8D28C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#0A0F1A',
        }}>{initials}</div>
        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </span>
        <span style={{ fontSize: 9, opacity: .6, marginLeft: 2 }}>▼</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 10px)',
          minWidth: 230, borderRadius: 14,
          background: 'linear-gradient(160deg,#0D1526 0%,#0A1A3A 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          {/* Identity header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'linear-gradient(135deg,#D4AF37,#E8D28C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#0A0F1A', flexShrink: 0,
              }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Signed in as</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>{user?.email}</p>
              </div>
            </div>
            {/* Tier badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: tierBadge.bg,
              border: `1px solid ${tierBadge.color}30`,
              fontSize: 11, fontWeight: 700, color: tierBadge.color,
              letterSpacing: '.4px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierBadge.color, display: 'inline-block' }} />
              {tierBadge.label} Plan
            </div>
          </div>

          {/* Nav links */}
          <div style={{ padding: '6px 0' }}>
            {NAV_ITEMS.map(({ label, to, highlight }) => (
              <Link key={label} to={to} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 16px', fontSize: 13, fontWeight: highlight ? 700 : 500,
                color: highlight ? '#D4AF37' : 'rgba(255,255,255,0.8)',
                textDecoration: 'none', transition: 'background .12s, color .12s',
              }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = highlight ? '#E8D28C' : '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = highlight ? '#D4AF37' : 'rgba(255,255,255,0.8)'; }}
              >
                {label}
                {highlight && <span style={{ fontSize: 10 }}>⚡</span>}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '6px 0 4px' }}>
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', textAlign: 'left',
              padding: '9px 16px', fontSize: 13, fontWeight: 500,
              color: 'rgba(248,113,113,0.85)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'background .12s, color .12s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#F87171'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.85)'; }}
            >
              <span style={{ fontSize: 14 }}>→</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketingNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
      {[
        { label: 'Features',     to: '/#features' },
        { label: 'NY Grants',     to: '/new-york-grants' },
        { label: 'Consultants',   to: '/consultants' },
        { label: 'Testimonials', to: '/#testimonials' },
        { label: 'Pricing',      to: '/pricing' },
        { label: 'Contact',      to: '/contact' },
      ].map(({ label, to }) => (
        <Link key={label} to={to} style={{
          color: isActive(to) ? '#D4AF37' : 'rgba(255,255,255,0.75)',
          fontWeight: isActive(to) ? 700 : 400,
          textDecoration: 'none', transition: 'color .15s',
        }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = isActive(to) ? '#D4AF37' : 'rgba(255,255,255,0.75)'}
        >{label}</Link>
      ))}
    </nav>
  );
}

function DraftsDropdown() {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch('/api/drafts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setDrafts((d.drafts || []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: open ? '#D4AF37' : 'rgba(255,255,255,0.75)',
        fontWeight: open ? 700 : 400, fontSize: 14,
        background: 'transparent', border: 'none', cursor: 'pointer',
        transition: 'color .15s', padding: '4px 0',
      }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = open ? '#D4AF37' : 'rgba(255,255,255,0.75)'}
      >
        Drafts
        <span style={{ fontSize: 9, opacity: .7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'calc(100% + 12px)', width: 260,
          background: '#fff', borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.13)', zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Recent Drafts
            </span>
          </div>

          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
          )}

          {!loading && drafts.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No drafts yet</div>
          )}

          {!loading && drafts.map(draft => (
            <div key={draft.id} onClick={() => { navigate(`/workspace/${draft.id}`); setOpen(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {draft.title || 'Untitled Draft'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(draft.updatedAt || draft.updated_at)}</div>
            </div>
          ))}

          <div onClick={() => { navigate('/dashboard'); setOpen(false); }}
            style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13,
              color: '#003A8C', fontWeight: 600, cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#f0f7ff'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            View all drafts →
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
      <Link to="/dashboard" style={{
        color: isActive('/dashboard') ? '#D4AF37' : 'rgba(255,255,255,0.75)',
        fontWeight: isActive('/dashboard') ? 700 : 400,
        textDecoration: 'none', transition: 'color .15s',
      }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = isActive('/dashboard') ? '#D4AF37' : 'rgba(255,255,255,0.75)'}
      >Dashboard</Link>
      <Link to="/clients" style={{
        color: isActive('/clients') ? '#D4AF37' : 'rgba(255,255,255,0.75)',
        fontWeight: isActive('/clients') ? 700 : 400,
        textDecoration: 'none', transition: 'color .15s',
      }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = isActive('/clients') ? '#D4AF37' : 'rgba(255,255,255,0.75)'}
      >Clients</Link>
      <Link to="/scott" style={{
        color: isActive('/scott') ? '#D4AF37' : 'rgba(255,255,255,0.75)',
        fontWeight: isActive('/scott') ? 700 : 400,
        textDecoration: 'none', transition: 'color .15s',
      }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = isActive('/scott') ? '#D4AF37' : 'rgba(255,255,255,0.75)'}
      >Scott</Link>
      <DraftsDropdown />
    </nav>
  );
}

export default function AppHeader() {
  const { user } = useUser();
  const [scrolled, setScrolled] = useState(false);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 60,
      background: 'linear-gradient(90deg,#0A0F1A 0%,#003A8C 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      transition: 'box-shadow 0.2s ease',
      boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.35)' : 'none',
    }}>
      {/* Logo */}
      <Link to={user ? '/dashboard' : '/'} style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg,#D4AF37,#E8D28C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#0A0F1A',
        }}>GM</div>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-.3px' }}>
          GrantsMaster
        </span>
      </Link>

      {/* Nav — animated transition between marketing and dashboard */}
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div key="dashboard-nav"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <DashboardNav />
          </motion.div>
        ) : (
          <motion.div key="marketing-nav"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <MarketingNav />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right side — also animated */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <LangSwitcher />
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div key="user-dropdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <UserDropdown user={user} />
            </motion.div>
          ) : (
            <motion.div key="auth-buttons"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Link to="/login" style={{
                padding: '7px 16px', borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.3)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', transition: 'border-color .15s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#fff'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
              >Login</Link>
              <Link to="/signup" style={{
                padding: '7px 16px', borderRadius: 8,
                background: '#D4AF37', color: '#0A0F1A',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                transition: 'opacity .15s',
              }}
                onMouseOver={e => e.currentTarget.style.opacity = '.88'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >Get Started Free</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
