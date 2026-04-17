  // Debug logs moved inside component
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useDrafts from '../hooks/useDrafts';
import { useUser } from './UserContext';

export default function FreeDashboard() {
    const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    };
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const userContext = useUser() || {};
  const user = userContext && typeof userContext === 'object' && 'user' in userContext ? userContext.user : null;
  const setUser = userContext && typeof userContext === 'object' && 'setUser' in userContext ? userContext.setUser : () => {};

  // Self-heal: if user is missing, try to restore from localStorage
  React.useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, [user, setUser]);
  const { drafts, loading, error } = useDrafts();

  if (!user) {
    return <div>Loading user data...</div>;
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', background: '#fff', position: 'relative' }} data-testid="dashboard-free-root">
      <button onClick={handleLogout} style={{ position: 'absolute', top: 16, right: 16, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      {showSuccess && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: 4, marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
          Signup successful! Welcome to Grants Master Free.
        </div>
      )}
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Welcome to Grants Master Free</h1>
      <p style={{ textAlign: 'center', color: '#555', marginBottom: '2rem' }}>
        Get started with your first grant draft. Upgrade anytime for more features!
      </p>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Your Drafts</h3>
        {loading && <div>Loading drafts...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!loading && drafts.length === 0 && <div>No drafts yet.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {drafts.map(draft => (
            <li key={draft.id} style={{ marginBottom: 8 }}>
              <button
                style={{ background: '#f8f9fa', border: '1px solid #ccc', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={() => navigate(`/draft/${draft.id}`)}
              >
                <b>{draft.title || 'Untitled Draft'}</b>
                <span style={{ float: 'right', color: '#888', fontSize: 12 }}>{new Date(draft.updatedAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer', width: 220 }}
          onClick={() => navigate('/draft')}
        >
          Start Writing
        </button>
        <button
          style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'not-allowed', opacity: 0.7 }}
          disabled
        >
          Generate Draft (Upgrade)
        </button>
        <button
          style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'not-allowed', opacity: 0.7 }}
          disabled
        >
          Edit Draft (Upgrade)
        </button>
        <button
          style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'not-allowed', opacity: 0.7 }}
          disabled
        >
          Save/Download (Upgrade)
        </button>
        <button
          style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'not-allowed', opacity: 0.7 }}
          disabled
        >
          Validator Access (Upgrade)
        </button>
      </div>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: 4 }}>You’ve used <b>0</b> of <b>5</b> free drafts this month</div>
        <div style={{ background: '#eee', borderRadius: 4, height: 12, width: '80%', margin: '0 auto', overflow: 'hidden' }}>
          <div style={{ background: '#007bff', width: '0%', height: '100%' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <span style={{ color: '#888' }}>Need more drafts or features?</span>
        <br />
        <a href="/pricing" style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold' }}>Upgrade your plan</a>
      </div>
    </div>
  );
}
