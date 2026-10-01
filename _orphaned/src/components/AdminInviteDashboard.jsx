// AdminInviteDashboard.jsx
// Admin dashboard for viewing, approving, and denying invite requests
import React, { useEffect, useState } from 'react';
import styles from './LandingPage.module.css';

export default function AdminInviteDashboard({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) return;
    setLoading(true);
    fetch('/admin/invite-requests', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setRequests(data.requests);
        else setError(data.message || 'Failed to load requests.');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load requests.');
        setLoading(false);
      });
  }, [user]);

  const handleAction = (requestId, action) => {
    setSubmitting(s => ({ ...s, [requestId]: true }));
    fetch(`/admin/${action}-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ requestId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRequests(reqs => reqs.map(r => r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'denied' } : r));
          setToast(`Invite ${action === 'approve' ? 'approved' : 'denied'}`);
        } else {
          setToast(data.message || 'Action failed.');
        }
        setSubmitting(s => ({ ...s, [requestId]: false }));
      })
      .catch(() => {
        setToast('Action failed.');
        setSubmitting(s => ({ ...s, [requestId]: false }));
      });
  };

  if (!user?.isAdmin) {
    return <div style={{ color: '#a00', margin: '2rem', textAlign: 'center' }}>You do not have access to this dashboard.</div>;
  }

  return (
    <div style={{ margin: '2rem auto', maxWidth: 900 }}>
      <h2>Invite Approval Dashboard</h2>
      {loading ? (
        <div style={{ textAlign: 'center', margin: '2rem' }}>Loading…</div>
      ) : error ? (
        <div style={{ color: '#a00', margin: '2rem', textAlign: 'center' }}>{error}</div>
      ) : (
        <table className={styles.adminInviteTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr className={styles.adminInviteRow} key={r.id}>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td>{r.organization}</td>
                <td>{r.reason}</td>
                <td className={styles.adminInviteStatus} style={{ textTransform: 'capitalize' }}>{r.status}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td className={styles.adminInviteActions}>
                  <button
                    disabled={submitting[r.id] || r.status !== 'pending'}
                    onClick={() => handleAction(r.id, 'approve')}
                    style={{ marginRight: 8 }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={submitting[r.id] || r.status !== 'pending'}
                    onClick={() => handleAction(r.id, 'deny')}
                  >
                    Deny
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: 0, right: 0, textAlign: 'center', zIndex: 9999 }}>
          <span style={{ background: '#222', color: '#fff', padding: '10px 24px', borderRadius: 8 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
