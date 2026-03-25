import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';

export default function TeamSettingsPanel({ onSeatUpgrade }) {
  const { user = null, ...userContextRest } = useUser() ?? {};
  const [addEmail, setAddEmail] = useState('');
  const [removeEmail, setRemoveEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [seatUsage, setSeatUsage] = useState({ used: 0, total: user && user.seats ? user.seats : 1 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Only enable for Agency Unlimited
  const isAgencyUnlimited = user && (user.tier === 'agency_unlimited' || (user.tier === 'agency' && user.seats === 'unlimited'));
    if (!user) {
      return <div>Loading user data...</div>;
    }
  useEffect(() => {
    if (isAgencyUnlimited) {
      fetch('/api/team/status')
        .then(res => res.json())
        .then(data => {
          setSeatUsage({ used: data.used, total: data.total });
          setPendingInvites(data.pendingInvites || []);
        });
    }
  }, [user.tier, user.seats, isAgencyUnlimited]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Invite sent!');
        setPendingInvites([...pendingInvites, { email: addEmail, status: 'pending' }]);
        setAddEmail('');
      } else {
        showToast(data.message || 'Failed to send invite.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: removeEmail })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member removed.');
        setRemoveEmail('');
      } else {
        showToast(data.message || 'Failed to remove member.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      showToast(data.success ? 'Invite resent.' : 'Failed to resend invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/cancel-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setPendingInvites(pendingInvites.filter(i => i.email !== email));
        showToast('Invite cancelled.');
      } else {
        showToast('Failed to cancel invite.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAgencyUnlimited) return null;

  return (
    <section>
      <h2>Team Settings</h2>
      <div>
        <label>Add team member (email): </label>
        <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} disabled={loading} />
        <button onClick={handleAdd} disabled={loading || !addEmail}>Add</button>
      </div>
      <div>
        <label>Remove team member: </label>
        <input type="email" value={removeEmail} onChange={e => setRemoveEmail(e.target.value)} disabled={loading} />
        <button onClick={handleRemove} disabled={loading || !removeEmail}>Remove</button>
      </div>
      <div>
        <b>Current seat usage:</b> {seatUsage.used}/{seatUsage.total}
      </div>
      <button onClick={onSeatUpgrade} disabled={loading}>Upgrade Seats</button>
      <div style={{ margin: '1rem 0' }}>
        <b>Pending Invites:</b>
        <ul>
          {pendingInvites.map(invite => (
            <li key={invite.email}>
              {invite.email} ({invite.status})
              <button onClick={() => handleResend(invite.email)} disabled={loading}>Resend</button>
              <button onClick={() => handleCancel(invite.email)} disabled={loading}>Cancel</button>
            </li>
          ))}
        </ul>
      </div>
      {toast && <div style={{ background: '#222', color: '#fff', padding: '0.5rem 1rem', borderRadius: 4, margin: '1rem 0' }}>{toast}</div>}
    </section>
  );
}
