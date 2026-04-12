  // Debug logs moved inside component
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import TierBadge from './TierBadge';
import './StarterDashboard.css';

const ProDashboard = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };
  const location = useLocation();
  const userContext = useUser();
  const user = userContext && typeof userContext === 'object' && 'user' in userContext ? userContext.user : null;
  const setUser = userContext && typeof userContext === 'object' && 'setUser' in userContext ? userContext.setUser : () => {};
  const params = new URLSearchParams(location.search);
  const showSuccess = params.get('success') === 'true';

  React.useEffect(() => {
    const isPostPayment = location.search.includes('success=true');
    if (user && user.tier !== 'pro' && !isPostPayment) {
      navigate('/upgrade', { replace: true });
    }
  }, [user, navigate, location]);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto', position: 'relative' }} data-testid="dashboard-pro-root">
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/')} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Home</button>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Pro Dashboard</h1>
        <div>
          <TierBadge tierLabel="Tier: Pro" />
        </div>
      </div>
      {showSuccess && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: 4, margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>
          🎉 Thanks for upgrading! Your Pro tier is now active.
        </div>
      )}
      {user.tier === 'pro' && (
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: 4, margin: '1rem 0' }}>
          <h3>Pro Features</h3>
          <ul>
            <li>✅ Unlimited grant drafts</li>
            <li>✅ Advanced agent guidance</li>
            <li>✅ Analytics dashboard</li>
            <li>✅ Priority support</li>
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer', width: 220 }}
          onClick={() => navigate('/workspace/pro-draft')}
        >
          Start Writing
        </button>
        <button
          style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Draft generated!')}
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
          onClick={handleDownload}
        >
          Save/Download
        </button>
        <button
          style={{ background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Validator access coming soon!')}
        >
          Validator Access
        </button>
        <button
          style={{ background: '#fd7e14', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Upload draft feature coming soon!')}
        >
          Upload Draft
        </button>
        <button
          style={{ background: '#20c997', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Refine with agent feature coming soon!')}
        >
          Refine with Agent
        </button>
        <button
          style={{ background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Analytics feature coming soon!')}
        >
          View Analytics
        </button>
      </div>
    </div>
  );
  function handleDownload() {
    alert('Download triggered. This will export the latest draft as a PDF or DOCX.');
  }
};

export default ProDashboard;
