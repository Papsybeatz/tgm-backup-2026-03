import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DraftPage from '../DraftPage';

function getToken() {
  return localStorage.getItem('token') || '';
}

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    fetch(`/api/drafts/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const nextDraft = data?.draft || data;
        if (nextDraft?.id) {
          setDraft(nextDraft);
        } else {
          setLoadError('Draft not found. It may have been deleted.');
        }
      })
      .catch(() => setLoadError('Could not load draft. Check your connection.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--tgm-error)', fontSize: 16 }}>{loadError}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    );
  }

  if (loading && !draft) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading draft…
      </div>
    );
  }

  return (
    <DraftPage
      draftId={id}
      initialTitle={draft?.title || ''}
      initialContent={draft?.content || ''}
    />
  );
}
