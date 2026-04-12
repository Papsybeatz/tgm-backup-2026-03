  // Debug logs moved inside component
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import TeamSettingsPanel from './TeamSettingsPanel';
import TierBadge from './TierBadge';

const AgencyDashboard = () => {
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
  const tier = params.get('tier') || (user ? user.tier : 'starter') || 'starter';

  React.useEffect(() => {
    const isPostPayment = location.search.includes('success=true');
    if (user && !['agency_starter', 'agency_unlimited', 'agency'].includes(user.tier) && !isPostPayment) {
      navigate('/upgrade', { replace: true });
    }
  }, [user, navigate, location]);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto', position: 'relative' }} data-testid="dashboard-agency-root">
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/')} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Home</button>
        <button onClick={handleLogout} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agency Dashboard</h1>
        <div>
          <TierBadge tierLabel={tier === 'unlimited' ? 'Tier: Agency Unlimited' : 'Tier: Agency Starter'} />
        </div>
      </div>
      {showSuccess && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: 4, margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>
          🎉 Thanks for upgrading! Your Agency tier is now active.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button
          style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer', width: 220 }}
          onClick={() => navigate('/draft')}
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
          onClick={() => alert('Download triggered!')}
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
        <button
          style={{ background: '#e83e8c', color: '#fff', border: 'none', borderRadius: 4, padding: '0.75rem 2rem', fontSize: '1rem', width: 220, cursor: 'pointer' }}
          onClick={() => alert('Team seat management coming soon!')}
        >
          Manage Team Seats
        </button>
      </div>
      <div style={{ margin: '2rem 0', background: '#f8f9fa', padding: '1rem', borderRadius: 4 }}>
        <TeamSettingsPanel onSeatUpgrade={() => window.location.href = 'https://grantsmaster.lemonsqueezy.com/checkout/buy/bbba7a22-44c0-4082-8530-ef5cf48bfcc5'} />
      </div>
      <div style={{ margin: '2rem 0', background: '#f8f9fa', padding: '1rem', borderRadius: 4 }}>
        <h3>Validator Access</h3>
        <p>Access advanced grant validation tools as part of your agency plan.</p>
      </div>
    </div>
  );
};

export default AgencyDashboard;
