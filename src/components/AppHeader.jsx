import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserContext';

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
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </span>
        <span style={{ fontSize: 10, opacity: .7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          minWidth: 210, borderRadius: 10,
          background: '#fff', border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '.5px' }}>Signed in as</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '3px 0 0', wordBreak: 'break-all' }}>{user?.email}</p>
          </div>
          {[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Drafts',    to: '/dashboard' },
            { label: 'Pricing',   to: '/pricing' },
          ].map(({ label, to }) => (
            <Link key={label} to={to} onClick={() => setOpen(false)} style={{
              display: 'block', padding: '10px 16px', fontSize: 14,
              color: '#1e293b', textDecoration: 'none',
            }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >{label}</Link>
          ))}
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

function MarketingNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
      {[
        { label: 'Features',     to: '/#features' },
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

function DashboardNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14 }}>
      {[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Drafts',    to: '/dashboard' },
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

export default function AppHeader() {
  const { user } = useUser();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 60,
      background: 'linear-gradient(90deg,#0A0F1A 0%,#003A8C 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Logo */}
      <Link to={user ? '/dashboard' : '/'} style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
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

      {/* Nav switches on auth state */}
      {user ? <DashboardNav /> : <MarketingNav />}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LangSwitcher />
        {user ? (
          <UserDropdown user={user} />
        ) : (
          <>
            <Link to="/login" style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1.5px solid rgba(255,255,255,0.3)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', transition: 'all .15s',
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
          </>
        )}
      </div>
    </header>
  );
}
