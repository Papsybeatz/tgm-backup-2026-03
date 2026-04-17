import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function MatchingTile() {
  return (
    <FeatureGate feature="matching_engine" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">🎯</span>
          <span>Matching Engine</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade to Pro for matching</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">🎯</span>
          <span>Matching Engine</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Find matching grants for your project</p>
          <button className="btn btn-primary" onClick={() => alert('Matching engine')}>
            Find Grants
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
