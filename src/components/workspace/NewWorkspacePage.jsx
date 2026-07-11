import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewWorkspacePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function startDraft() {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title: 'Untitled Draft',
            content: '',
          }),
        });
        const data = await res.json();
        const draft = data?.draft || data;

        if (!cancelled && draft?.id) {
          navigate(`/workspace/${draft.id}`, { replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          navigate('/dashboard', { replace: true });
        }
      }
    }

    startDraft();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
