import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSkin } from '../hooks/useSkin';

function SkinToggleInternal() {
  const { skin, toggleSkin } = useSkin();
  return (
    <button
      onClick={toggleSkin}
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid var(--border, #e5e7eb)`,
        color: 'var(--text, #111)',
        opacity: 0.8,
        fontSize: 13,
        cursor: 'pointer',
        background: 'transparent'
      }}
    >
      {skin === 'default' ? 'AI Mode' : 'Classic'}
    </button>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: `1px solid var(--border, #e5e7eb)`,
          color: 'var(--text, #111)',
          fontSize: 13,
          cursor: 'pointer',
          background: 'transparent'
        }}
      >
        {user?.name || user?.email || 'Account'}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 4,
          minWidth: 140,
          borderRadius: 8,
          border: `1px solid var(--border, #e5e7eb)`,
          background: 'var(--card, #fff)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          zIndex: 100
        }}>
          <Link
            to={user?.tier === 'free' ? '/dashboard/free' : `/dashboard/${user?.tier}`}
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '10px 14px',
              color: 'var(--text, #111)',
              fontSize: 13,
              textDecoration: 'none'
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/workspace/premium-draft"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '10px 14px',
              color: 'var(--text, #111)',
              fontSize: 13,
              textDecoration: 'none'
            }}
          >
            Drafts
          </Link>
          <button
            onClick={logout}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 14px',
              textAlign: 'left',
              color: 'var(--text, #111)',
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppHeader({ user, loading }) {
  const { skin } = useSkin();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid var(--border, ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'})`,
        background: 'var(--card, #fff)',
        backdropFilter: 'blur(12px)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
        {user && !loading ? (
          <>
            <Link
              to={user.tier === 'free' ? '/dashboard/free' : `/dashboard/${user.tier}`}
              style={{
                fontWeight: 600,
                color: 'var(--text, #111)',
                textDecoration: 'none'
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/workspace/premium-draft"
              style={{
                color: 'var(--text, #111)',
                opacity: 0.7,
                textDecoration: 'none'
              }}
            >
              Drafts
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/"
              style={{
                fontWeight: 600,
                color: 'var(--text, #111)',
                textDecoration: 'none'
              }}
            >
              Home
            </Link>
            <Link
              to="/pricing"
              style={{
                color: 'var(--text, #111)',
                opacity: 0.7,
                textDecoration: 'none'
              }}
            >
              Pricing
            </Link>
            <Link
              to="/contact"
              style={{
                color: 'var(--text, #111)',
                opacity: 0.7,
                textDecoration: 'none'
              }}
            >
              Contact
            </Link>
          </>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkinToggleInternal />
        {loading ? (
          <span style={{ fontSize: 13, opacity: 0.6 }}>Loading...</span>
        ) : user ? (
          <UserMenu user={user} />
        ) : (
          <Link
            to="/login"
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid var(--accent, #4f46e5)`,
              color: 'var(--accent, #4f46e5)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}