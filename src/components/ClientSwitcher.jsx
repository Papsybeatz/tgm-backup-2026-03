import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ClientSwitcher({ currentClientId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    fetch('/api/clients', { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <select
      value={currentClientId || ''}
      onChange={(event) => {
        const value = event.target.value;
        if (value === '__all') navigate('/clients');
        if (value && value !== '__all') navigate(`/clients/${value}`);
      }}
      disabled={loading}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
      aria-label="Switch client"
    >
      <option value="__all">All clients</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>{client.name}</option>
      ))}
    </select>
  );
}
