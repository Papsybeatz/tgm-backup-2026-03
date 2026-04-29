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
      const newDraft = data.draft || data;
      if (newDraft?.id) {
        setDrafts(prev => [newDraft, ...prev]);
        return newDraft;
      }
    } catch (e) {
      console.error('Create draft failed', e);
    }
    return null;
  }, []);

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
