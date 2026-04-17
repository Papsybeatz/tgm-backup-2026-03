import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function VersionsPanel({ draftId, onRestore }) {
  const { token } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!draftId || !token) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/drafts/${encodeURIComponent(draftId)}/versions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.success) setVersions(data.versions || []);
        else setError('Failed to load versions');
      })
      .catch(() => setError('Failed to load versions'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [draftId, token]);

  async function handleRestore(versionId) {
    if (!token) return;
    if (!confirm('Restore this version? This will overwrite current draft content.')) return;
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}/versions/${encodeURIComponent(versionId)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.draft) {
        if (onRestore) onRestore(data.draft.content);
        // refresh versions
        setVersions((prev) => prev);
        alert('Version restored');
      } else {
        alert(data.message || 'Restore failed');
      }
    } catch (e) {
      alert('Network error while restoring version');
    }
  }

  if (!draftId) return null;

  return (
    <div style={{ padding: 12, borderLeft: '1px solid #eee', width: 300 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Versions</div>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && versions.length === 0 && <div style={{ color: '#666' }}>No versions yet</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {versions.map((v) => (
          <li key={v.id} style={{ marginBottom: 10, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#333' }}>{new Date(v.createdAt).toLocaleString()}</div>
            <div style={{ fontSize: 13, color: '#444', maxHeight: 48, overflow: 'hidden' }}>{v.content}</div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => handleRestore(v.id)} style={{ padding: '6px 10px' }}>Restore</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
