import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserContext';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

function LangSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.slice(0, 2) || 'en';

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  // Subscribing to t() ensures re-render on language change
  void t;

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {LANGUAGES.map(l => (
        <button key={l.code} onClick={() => change(l.code)} style={{
          padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          border: current === l.code ? 'none' : '1px solid var(--tgm-border)',
          background: current === l.code ? 'var(--tgm-gold)' : 'transparent',
          color: current === l.code ? 'var(--tgm-navy)' : 'var(--tgm-muted)',
          cursor: 'pointer', transition: 'all .15s',
        }}>{l.label}</button>
      ))}
    </div>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { setUser } = useUser();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tgm_onboarded');
    setOpen(false);
    navigate('/login');
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
      >
        <div className="w-7 h-7 rounded bg-gradient-to-br from-yellow-400 to-yellow-200 flex items-center justify-center font-bold text-xs text-blue-900">GM</div>
        <span>{user?.name || user?.email || 'Account'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-200 z-50">
          <Link
            to="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >Dashboard</Link>
          <Link
            to="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >Drafts</Link>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >Logout</button>
        </div>
      )}
    </div>
  );
}

export default function AppHeader({ user, loading }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 60,
      background: 'rgba(255,255,255,.92)',
      borderBottom: '1px solid var(--tgm-border)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'var(--tgm-navy)',
          boxShadow: 'var(--tgm-shadow-sm)',
        }}>GM</div>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--tgm-navy)', letterSpacing: '-.3px' }}>
          GrantsMaster
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
        {user && !loading ? (
          <>
            <Link to="/dashboard" style={{ fontWeight: 600, color: 'var(--tgm-navy)' }}>Dashboard</Link>
            <Link to="/dashboard" style={{ color: 'var(--tgm-muted)' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--tgm-navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--tgm-muted)'}
            >Drafts</Link>
          </>
        ) : (
          <>
            <Link to="/" style={{ color: 'var(--tgm-muted)' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--tgm-navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--tgm-muted)'}
            >Home</Link>
            <Link to="/pricing" style={{ color: 'var(--tgm-muted)' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--tgm-navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--tgm-muted)'}
            >Pricing</Link>
            <Link to="/contact" style={{ color: 'var(--tgm-muted)' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--tgm-navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--tgm-muted)'}
            >Contact</Link>
          </>
        )}
      </nav>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LangSwitcher />
        {loading ? (
          <span style={{ fontSize: 14, color: 'var(--tgm-muted)' }}>Loading…</span>
        ) : user ? (
          <UserMenu user={user} />
        ) : (
          <>
            <Link to="/login" style={{
              padding: '7px 16px', borderRadius: 'var(--tgm-radius-md)',
              border: '1.5px solid var(--tgm-blue)',
              color: 'var(--tgm-blue)', fontSize: 14, fontWeight: 600,
              transition: 'background .15s, color .15s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--tgm-blue)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tgm-blue)'; }}
            >Login</Link>
            <Link to="/signup" style={{
              padding: '7px 16px', borderRadius: 'var(--tgm-radius-md)',
              background: 'var(--tgm-gold)', color: 'var(--tgm-navy)',
              fontSize: 14, fontWeight: 700, boxShadow: 'var(--tgm-shadow-sm)',
              transition: 'opacity .15s',
            }}
              onMouseOver={e => e.currentTarget.style.opacity = '.88'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >Get Started Free</Link>
          </>
        )}
      </div>
    </header>
  );
}
