import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function useDrafts() {
  const { user, token } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    fetch(`/api/drafts?email=${encodeURIComponent(user.email)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load drafts'))
      .then(data => setDrafts(data.drafts || []))
      .catch(() => setError('Could not load drafts'))
      .finally(() => setLoading(false));
  }, [user?.email, token]);

  return { drafts, loading, error };
}
