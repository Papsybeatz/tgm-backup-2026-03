  // Debug logs moved inside component


import React, { useEffect } from 'react';
import { logEvent } from '../utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import './StarterDashboard.css';



const StarterDashboard = () => {
    const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    };
  const navigate = useNavigate();
  const location = useLocation();
  const userContext = useUser();
  const user = userContext && typeof userContext === 'object' && 'user' in userContext ? userContext.user : null;
  const setUser = userContext && typeof userContext === 'object' && 'setUser' in userContext ? userContext.setUser : () => {};
  const params = new URLSearchParams(location.search);
  const showSuccess = params.get('success') === 'true';

  useEffect(() => {
    const isPostPayment = location.search.includes('success=true');
    if (user && user.tier !== 'starter' && !isPostPayment) {
      navigate('/upgrade', { replace: true });
    }
  }, [user, navigate, location]);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto', position: 'relative' }} data-testid="dashboard-starter-root">
      <button onClick={handleLogout} style={{ position: 'absolute', top: 16, right: 16, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Starter Dashboard</h1>
        <span style={{ background: '#007bff', color: '#fff', borderRadius: 4, padding: '0.25rem 0.75rem', fontWeight: 'bold' }}>Tier: {user.tier === 'starter' ? 'Starter' : 'Free'}</span>
      </div>
      {showSuccess && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: 4, margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>
          🎉 Thanks for upgrading! Your Starter tier is now active.
        </div>
      )}
      {user.tier === 'starter' && (
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 4, margin: '1rem 0' }}>
          <h3>Starter Features</h3>
          <ul>
            <li>✅ 5 grant drafts per month</li>
            <li>✅ Downloadable proposals</li>
            <li>✅ 1 team seat</li>
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer', width: 220 }}
          onClick={() => navigate('/workspace/starter-draft')}
        >
          Start Writing
        </button>
        <button
          style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
            onClick={() => {
              logEvent('DRAFT_GENERATED', { tier: 'Starter', userId: user.userId });
              alert('Draft generated!');
            }}
        >
          Generate Draft
        </button>
        <button
          style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Edit draft feature coming soon!')}
        >
          Edit Draft
        </button>
        <button
          style={{ background: '#ffc107', color: '#333', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
            onClick={() => {
              logEvent('DOWNLOAD_TRIGGERED', { tier: 'Starter', userId: user.userId });
              alert('Download triggered!');
            }}
        >
          Save/Download
        </button>
        <button
          style={{ background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
            onClick={() => {
              logEvent('FILE_UPLOADED', { tier: 'Starter', userId: user.userId });
              alert('Validator access coming soon!');
            }}
        >
          Validator Access
        </button>
      </div>
    </div>
  );
};

export default StarterDashboard;
