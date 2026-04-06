import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [inviteQueue, setInviteQueue] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users').then(res => res.json()).then(setUsers);
    fetch('/api/admin/invite-queue').then(res => res.json()).then(setInviteQueue);
  }, []);

  const handleApprove = (id) => {
    fetch(`/api/admin/approve-invite/${id}`, { method: 'POST' })
      .then(() => setInviteQueue(inviteQueue.filter(i => i.id !== id)));
  };
  const handleDeny = (id) => {
    fetch(`/api/admin/deny-invite/${id}`, { method: 'POST' })
      .then(() => setInviteQueue(inviteQueue.filter(i => i.id !== id)));
  };
  const handleTierOverride = (userId, tier) => {
    fetch(`/api/admin/override-tier/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier })
    });
  };
  const handleExport = () => {
    setExporting(true);
    fetch('/api/admin/export-usage').then(res => res.blob()).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'usage.csv';
      a.click();
      setExporting(false);
    });
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Admin Dashboard</h1>
      <h2>User List</h2>
      <table style={{ width: '100%', marginBottom: 32 }}>
        <thead>
          <tr><th>User ID</th><th>Tier</th><th>Drafts Used</th><th>Override Tier</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.userId}>
              <td>{u.userId}</td>
              <td>{u.tier}</td>
              <td>{u.draftsUsed}</td>
              <td>
                <select defaultValue={u.tier} onChange={e => handleTierOverride(u.userId, e.target.value)}>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="agency">Agency</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Invite Request Queue</h2>
      <table style={{ width: '100%', marginBottom: 32 }}>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Organization</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {inviteQueue.map(i => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.email}</td>
              <td>{i.organization}</td>
              <td>
                <button onClick={() => handleApprove(i.id)}>Approve</button>
                <button onClick={() => handleDeny(i.id)}>Deny</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleExport} disabled={exporting}>Export Usage Data (CSV)</button>
    </div>
  );
}
