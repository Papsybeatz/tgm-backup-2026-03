import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function ClientsTile() {
  return (
    <FeatureGate feature="client_folders" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">🏢</span>
          <span>Client Folders</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade to Agency for client folders</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">🏢</span>
          <span>Client Folders</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Manage your client workspaces</p>
          <button className="btn btn-primary" onClick={() => alert('Client folders')}>
            Manage Clients
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
