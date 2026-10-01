import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import TeamSettingsPanel from './TeamSettingsPanel';
import TierBadge from './TierBadge';

const AgencyDashboard = () => {
  const navigate = useNavigate();
  const userContext = useUser();
  const user = userContext?.user || null;
  const setUser = userContext?.setUser || (() => {});

  const tier = user?.tier || 'agency_starter';

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  React.useEffect(() => {
    if (user && !['agency_starter', 'agency_unlimited', 'agency'].includes(user.tier)) {
      navigate('/upgrade', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return <div className="loading">Loading user data...</div>;
  }

  const actions = [
    { label: 'Start Writing', onClick: () => navigate('/draft'), variant: 'btn-primary' },
    { label: 'Generate Draft', onClick: () => alert('Draft generated!'), variant: 'btn-success' },
    { label: 'Edit Draft', onClick: () => alert('Edit draft coming soon!'), variant: 'btn-secondary' },
    { label: 'Save / Download', onClick: () => alert('Download triggered!'), variant: 'btn-secondary' },
    { label: 'Validator Access', onClick: () => alert('Validator coming soon!'), variant: 'btn-secondary' },
    { label: 'Upload Draft', onClick: () => alert('Upload coming soon!'), variant: 'btn-secondary' },
    { label: 'Refine with Agent', onClick: () => alert('Agent refinement coming soon!'), variant: 'btn-secondary' },
    { label: 'View Analytics', onClick: () => alert('Analytics coming soon!'), variant: 'btn-secondary' },
    { label: 'Manage Team Seats', onClick: () => alert('Team seat management coming soon!'), variant: 'btn-secondary' },
  ];

  return (
    <div className="content-wrapper" data-testid="dashboard-agency-root">
      <div className="flex-between mb-lg">
        <div className="flex items-center gap-md">
          <h1 className="heading-lg">Agency Dashboard</h1>
          <TierBadge tierLabel={tier === 'agency_unlimited' ? 'Agency Unlimited' : 'Agency Starter'} />
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="grid grid-3 mb-lg">
        {actions.map(({ label, onClick, variant }) => (
          <button key={label} className={`btn ${variant} w-full`} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>

      <div className="card mb-lg">
        <div className="card-header">Team Settings</div>
        <div className="card-body">
          <TeamSettingsPanel
            onSeatUpgrade={() => window.location.href = '/upgrade'}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">Validator Access</div>
        <div className="card-body">
          <p className="body-text">Access advanced grant validation tools as part of your agency plan.</p>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboard;
