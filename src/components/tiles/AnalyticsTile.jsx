import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function AnalyticsTile() {
  return (
    <FeatureGate feature="analytics_advanced" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">📈</span>
          <span>Analytics</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade for analytics</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">📈</span>
          <span>Analytics</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Track your grant performance</p>
          <button className="btn btn-primary" onClick={() => alert('Analytics')}>
            View Analytics
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
