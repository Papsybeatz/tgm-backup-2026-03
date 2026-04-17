import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function ScoringTile() {
  return (
    <FeatureGate feature="scoring_engine" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">📊</span>
          <span>Scoring Engine</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade to access scoring</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">📊</span>
          <span>Scoring Engine</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Score and analyze your grant proposals</p>
          <button className="btn btn-primary" onClick={() => alert('Scoring engine')}>
            Score Draft
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
