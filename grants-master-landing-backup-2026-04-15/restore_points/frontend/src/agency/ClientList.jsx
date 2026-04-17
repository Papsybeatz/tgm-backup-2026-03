import { useAgency } from "./hooks/useAgency";
import React, { useState } from "react";
import ClientAvatar from "../components/ClientAvatar.jsx";

export default function ClientList({ onAddClient }) {
  const { clients, switchClient, activeClient } = useAgency();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const safeClients = Array.isArray(clients) ? clients : [];
  const filtered = safeClients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "az" ? a.name.localeCompare(b.name) : b.lastActive - a.lastActive);

  return (
    <div className="card">
      <div className="header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3>Your Clients</h3>
          <span style={{ background: '#2f80ed', color: '#fff', borderRadius: 8, padding: '0 8px', fontWeight: 600, fontSize: '0.95em' }}>{clients.length}</span>
        </div>
        <button className="primary" onClick={onAddClient}>Onboard Client</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, borderRadius: 6, border: '1px solid #e0e7ef', padding: '4px 8px' }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ borderRadius: 6, border: '1px solid #e0e7ef', padding: '4px 8px' }}>
          <option value="az">A–Z</option>
          <option value="recent">Recently Active</option>
        </select>
      </div>
      {filtered.length === 0 && <p className="text-muted">No clients found.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {filtered.map(c => (
          <li key={c.id} style={{ marginBottom: 6 }}>
            <button
              className={activeClient === c.id ? "active" : ""}
              onClick={() => switchClient(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                background: activeClient === c.id ? 'rgba(47,128,237,0.08)' : 'transparent',
                borderRadius: 8, padding: '6px 8px', border: 'none', cursor: 'pointer',
                boxShadow: activeClient === c.id ? '0 2px 8px rgba(47,128,237,0.10)' : 'none',
                fontWeight: 500,
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              <ClientAvatar name={c.name} size={28} />
              <span>{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
