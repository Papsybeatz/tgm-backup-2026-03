import { useEffect, useRef, useState } from 'react';
import useAuth from './useAuth';

export default function useAutosave({ content, title, draftId, debounceMs = 700 }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const timer = useRef();
  const lastPayload = useRef({});
  const { token } = useAuth();

  // Save draft function
  const saveDraft = async (payload) => {
    setSaving(true);
    setSaved(false);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      let res;
      if (currentDraftId) {
        res = await fetch(`/api/drafts/${currentDraftId}`, { method: 'PATCH', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
      } else {
        res = await fetch('/api/drafts', { method: 'POST', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
      }
      if (res && res.ok) {
        const data = await res.json();
        const newId = data?.draft?.id || null;
        if (newId) setCurrentDraftId(newId);
        setSaved(true);
      } else {
        console.warn('[useAutosave] save failed', res && res.status);
      }
    } catch {}
    setSaving(false);
  };

  // Debounced autosave on content/title/email change
  useEffect(() => {
    if (!token || !content) return;
    const payload = { title, content };
    if (JSON.stringify(payload) === JSON.stringify(lastPayload.current)) return;
    lastPayload.current = payload;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveDraft(payload), debounceMs);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [content, title, token]);

  // Save on blur
  const onBlur = () => {
    if (!token || !content) return;
    const payload = { title, content };
    saveDraft(payload);
  };

  return { saving, saved, draftId: currentDraftId, onBlur };
}
