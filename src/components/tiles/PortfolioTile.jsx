import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function PortfolioTile() {
  return (
    <FeatureGate feature="analytics_portfolio" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">📊</span>
          <span>Portfolio Analytics</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade to Agency Unlimited</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">📊</span>
          <span>Portfolio Analytics</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Multi-client analytics dashboard</p>
          <button className="btn btn-primary" onClick={() => alert('Portfolio')}>
            View Portfolio
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
