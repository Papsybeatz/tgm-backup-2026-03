import { useState, useEffect, useCallback } from 'react';

function getToken() {
  return localStorage.getItem('token') || '';
}

export function useDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/drafts', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : data.drafts || []);
    } catch (e) {
      setError('Could not load drafts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const getExistingDraft = useCallback(async () => {
    const listRes = await fetch('/api/drafts', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const listData = await listRes.json();
    const existingDrafts = Array.isArray(listData?.drafts)
      ? listData.drafts
      : Array.isArray(listData)
        ? listData
        : [];
    if (existingDrafts.length > 0) {
      setDrafts(existingDrafts);
      return existingDrafts[0];
    }
    return null;
  }, []);

  const createDraft = useCallback(async (title = 'Untitled Draft') => {
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, content: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.reason === 'draft_limit_reached') {
          const existingDraft = await getExistingDraft();
          if (existingDraft?.id) return existingDraft;
          alert(data.message || 'Free tier limit reached. Upgrade to save more drafts.');
        }
        return null;
      }
      const newDraft = data.draft || data;
      if (newDraft?.id) {
        setDrafts(prev => [newDraft, ...prev]);
        return newDraft;
      }
    } catch (e) {
      console.error('Create draft failed', e);
    }
    return null;
  }, [getExistingDraft]);

  const deleteDraft = useCallback(async (id) => {
    try {
      await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error('Delete draft failed', e);
    }
  }, []);

  return { drafts, loading, error, fetchDrafts, createDraft, deleteDraft };
}
