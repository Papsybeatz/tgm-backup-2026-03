import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function useDrafts() {
  const { user, token } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/drafts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load drafts');
        const data = await res.json();
        setDrafts(data.drafts || []);
      } catch (e) {
        setError('Could not load drafts');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line
  }, [token]);

  return { drafts, loading, error };
}
