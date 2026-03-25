import React from "react";
import ClientAvatar from "../components/ClientAvatar.jsx";

// Mock icons for mission, goals, readiness
const icons = {
  mission: "🎯",
  goals: "🏆",
  readiness: "✅",
};

export default function ClientProfilePage({ client }) {
  // Mock data for demo
  const drafts = client.drafts || [];
  const scores = client.scores || [];
  const matches = client.matches || [];
  const activity = client.activity || [];
  return (
    <div className="dashboard-container" style={{ background: 'rgba(47,128,237,0.03)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
        <div style={{ minWidth: 220 }}>
          <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
            <ClientAvatar name={client.name} size={56} />
            <h2 style={{ margin: '12px 0 4px 0' }}>{client.name}</h2>
            <div className="text-muted">{client.sector}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{icons.mission}</span>
              <span style={{ fontWeight: 600 }}>Mission</span>
            </div>
            <div className="text-muted">{client.mission}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{icons.readiness}</span>
              <span style={{ fontWeight: 600 }}>Readiness</span>
            </div>
            <div className="text-muted">{client.readiness}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{icons.goals}</span>
              <span style={{ fontWeight: 600 }}>Goals</span>
            </div>
            <div className="text-muted">{client.goals}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3>Drafts</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {drafts.map(d => (
                <li key={d.id} style={{ marginBottom: 4 }}>{d.title}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Scores</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {scores.map(s => (
                <li key={s.id} style={{ marginBottom: 4 }}>Score: {s.value} ({s.date})</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Matching Results</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {matches.map(m => (
                <li key={m.id} style={{ marginBottom: 4 }}>{m.title}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Activity Timeline</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {activity.map((a, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
