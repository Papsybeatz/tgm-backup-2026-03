import React from 'react';
import { FeatureGate } from '../FeatureGate';

export default function CalendarTile() {
  return (
    <FeatureGate feature="grant_calendar" fallback={
      <div className="card tile gated">
        <div className="card-header">
          <span className="tile-icon">📅</span>
          <span>Grant Calendar</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Upgrade to Pro for calendar</p>
          <a href="/pricing" className="btn btn-primary">Upgrade</a>
        </div>
      </div>
    }>
      <div className="card tile">
        <div className="card-header">
          <span className="tile-icon">📅</span>
          <span>Grant Calendar</span>
        </div>
        <div className="card-body">
          <p className="text-muted mb-md">Track grant deadlines</p>
          <button className="btn btn-primary" onClick={() => alert('Calendar')}>
            View Calendar
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
