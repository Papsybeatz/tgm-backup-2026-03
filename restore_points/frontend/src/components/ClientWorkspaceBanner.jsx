import React from "react";
import ClientAvatar from "../components/ClientAvatar.jsx";

export default function ClientWorkspaceBanner({ client, onSwitchClient, clients }) {
  return (
    <div className="client-workspace-banner" style={{
      display: 'flex', alignItems: 'center', gap: 20, padding: '16px 24px', background: 'rgba(47,128,237,0.06)', borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(47,128,237,0.06)'
    }}>
      <ClientAvatar name={client.name} size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '1.15em' }}>{client.name}</div>
        <div className="text-muted" style={{ fontSize: '0.98em' }}>{client.sector}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="text-muted" style={{ fontSize: '0.95em' }}>You are working on behalf of:</span>
        <select value={client.id} onChange={e => onSwitchClient(e.target.value)} style={{ borderRadius: 8, border: '1px solid #e0e7ef', padding: '4px 12px', fontWeight: 600 }}>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
