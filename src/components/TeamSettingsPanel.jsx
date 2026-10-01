import React, { useCallback, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { TIERS } from '../config/tiers';

/**
 * Team settings — seats and invites.
 *
 * Every call here now authenticates with the session token and hits the
 * DB-backed /api/team router. It used to call an unauthenticated /api/team/status
 * that returned the same two fake pending invites to every account, and an /add
 * that wrote nothing to the database.
 */
export default function TeamSettingsPanel({ onSeatUpgrade }) {
  const { user = null } = useUser() ?? {};
  const [addEmail, setAddEmail] = useState('');
  const [removeEmail, setRemoveEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [seatUsage, setSeatUsage] = useState({ used: 0, total: user && user.seats ? user.seats : 1 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [lastLink, setLastLink] = useState('');

  // Any tier that actually grants seats can manage them: Pro (3), Agency (10),
  // Agency+ (unlimited). This used to be hardcoded to agency_unlimited, so Pro
  // and Agency customers paid for seats they had no way to use.
  const seatCap = user ? TIERS[user.tier]?.limits?.teamSeats ?? 0 : 0;
  const canManageSeats = seatCap > 0;

  const authHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  /** Read the seat readout from the server. No local guessing. */
  const loadStatus = useCallback(async () => {
    if (!canManageSeats) return;
    try {
      const res = await fetch('/api/team/status', { headers: authHeaders(), credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setToast(data.message || 'Could not load team status.');
        return;
      }
      setSeatUsage({ used: data.used, total: data.total });
      setPendingInvites(data.pendingInvites || []);
    } catch {
      setToast('Could not reach the server.');
    }
  }, [authHeaders, canManageSeats]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus, user?.tier]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 6000);
  };

  const handleAdd = async () => {
    setLoading(true);
    setLastLink('');
    try {
      const res = await fetch('/api/team/add', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ email: addEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        // If the email could not be sent, hand the inviter the link to copy.
        if (data.emailed === false && data.inviteLink) {
          setLastLink(data.inviteLink);
          showToast(data.message || 'Invite created, but the email could not be sent.');
        } else {
          showToast('Invite sent!');
        }
        setAddEmail('');
        await loadStatus();
      } else {
        showToast(data.message || 'Failed to send invite.');
      }
    } catch {
      showToast('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ email: removeEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        showToast(data.message || 'Member removed.');
        setRemoveEmail('');
        await loadStatus();
      } else {
        showToast(data.message || 'Failed to remove member.');
      }
    } catch {
      showToast('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (email) => {
    setLoading(true);
    setLastLink('');
    try {
      const res = await fetch('/api/team/resend-invite', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.emailed === false && data.inviteLink) {
        setLastLink(data.inviteLink);
      }
      showToast(data.success ? data.message || 'Invite resent.' : data.message || 'Failed to resend invite.');
    } catch {
      showToast('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/team/cancel-invite', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        showToast(data.message || 'Invite cancelled.');
        await loadStatus();
      } else {
        showToast(data.message || 'Failed to cancel invite.');
      }
    } catch {
      showToast('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Loading user data...</div>;
  if (!canManageSeats) return null;

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
        {pendingInvites.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 13, margin: '6px 0 0' }}>No pending invites.</p>
        ) : (
          <ul>
            {pendingInvites.map(invite => (
              <li key={invite.email}>
                {invite.email} ({invite.status})
                <button onClick={() => handleResend(invite.email)} disabled={loading}>Resend</button>
                <button onClick={() => handleCancel(invite.email)} disabled={loading}>Cancel</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {lastLink && (
        <div style={{ background: '#F7F9FB', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '1rem 0' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#003A8C', margin: '0 0 6px' }}>
            Email not sent — copy this invite link and send it yourself:
          </p>
          <input readOnly value={lastLink} onFocus={e => e.target.select()} style={{ width: '100%', fontSize: 12, padding: 8, borderRadius: 6, border: '1px solid #CBD5E1' }} />
        </div>
      )}
      {toast && <div style={{ background: '#222', color: '#fff', padding: '0.5rem 1rem', borderRadius: 4, margin: '1rem 0' }}>{toast}</div>}
    </section>
  );
}
