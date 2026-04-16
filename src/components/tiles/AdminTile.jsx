import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function AdminTile() {
  return (
    <FeatureGate feature="admin_controls" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">⚙️</span>
          <span>Admin Controls</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Agency Unlimited only</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">⚙️</span>
          <span>Admin Controls</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Manage users and workspaces</p>
          <button className="btn btn-primary" onClick={() => alert('Admin')}>
            Admin Panel
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
