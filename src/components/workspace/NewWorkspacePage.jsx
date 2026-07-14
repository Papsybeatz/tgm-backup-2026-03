import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../lib/apiUrl';

export default function NewWorkspacePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function startDraft() {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(apiUrl('/api/drafts'), {
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

        if (!cancelled) {
          if (!res.ok) {
            if (res.status === 403 && data.reason === 'draft_limit_reached') {
               alert(data.message || 'Free tier limit reached. Upgrade to save more drafts.');
            }
            navigate('/dashboard', { replace: true });
            return;
          }
          if (draft?.id) {
            navigate(`/workspace/${draft.id}`, { replace: true });
          } else {
             navigate('/dashboard', { replace: true });
          }
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
