import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DraftTile() {
  const navigate = useNavigate();

  return (
    <div className="card tile">
      <div className="card-header">
        <span className="tile-icon">📝</span>
        <span>Draft Generator</span>
      </div>
      <div className="card-body">
        <p className="text-muted mb-md">Create and manage your grant drafts</p>
        <div className="tile-actions">
          <button className="btn btn-primary" onClick={() => navigate('/workspace/new-draft')}>
            New Draft
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/workspace/new-draft')}>
            View Drafts
          </button>
        </div>
      </div>
    </div>
  );
}
