import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { getDashboardModules, TIERS } from '../config/tiers';
import DraftTile from './tiles/DraftTile';
import ScoringTile from './tiles/ScoringTile';
import MatchingTile from './tiles/MatchingTile';
import AnalyticsTile from './tiles/AnalyticsTile';
import CalendarTile from './tiles/CalendarTile';
import ClientsTile from './tiles/ClientsTile';
import PortfolioTile from './tiles/PortfolioTile';
import AdminTile from './tiles/AdminTile';
import './UnifiedDashboard.css';

const TILE_COMPONENTS = {
  draft: DraftTile,
  scoring: ScoringTile,
  matching: MatchingTile,
  analytics: AnalyticsTile,
  calendar: CalendarTile,
  clients: ClientsTile,
  portfolio: PortfolioTile,
  admin: AdminTile
};

export default function UnifiedDashboard() {
  const navigate = useNavigate();
  const userContext = useUser();
  const user = userContext?.user;
  const tier = user?.tier || 'free';
  const tierConfig = TIERS[tier] || TIERS.free;
  
  const modules = getDashboardModules(tier);
  const tierName = tierConfig.name;

  const handleLogout = () => {
    if (userContext?.setUser) {
      userContext.setUser(null);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="heading-lg">{tierName} Dashboard</h1>
          <span className={`tier-badge tier-${tier}`}>{tierName}</span>
        </div>
        <div className="header-right">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-grid">
        {modules.map(moduleKey => {
          const TileComponent = TILE_COMPONENTS[moduleKey];
          if (!TileComponent) return null;
          return <TileComponent key={moduleKey} />;
        })}
      </div>

      <div className="dashboard-footer">
        <p className="text-muted text-sm">
          Need more features? <a href="/pricing" className="link">Upgrade your plan</a>
        </p>
      </div>
    </div>
  );
}
