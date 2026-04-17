import { useEffect, useRef, useState } from 'react';

export default function useAutosave({ content, title, email, draftId, debounceMs = 5000 }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const timer = useRef();
  const lastPayload = useRef({});

  // Save draft function
  const saveDraft = async (payload) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentDraftId(data.id);
        setSaved(true);
      }
    } catch {}
    setSaving(false);
  };

  // Debounced autosave on content/title/email change
  useEffect(() => {
    if (!email || !content) return;
    const payload = { id: currentDraftId, email, title, content };
    if (JSON.stringify(payload) === JSON.stringify(lastPayload.current)) return;
    lastPayload.current = payload;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveDraft(payload), debounceMs);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [content, title, email]);

  // Save on blur
  const onBlur = () => {
    if (!email || !content) return;
    const payload = { id: currentDraftId, email, title, content };
    saveDraft(payload);
  };

  return { saving, saved, draftId: currentDraftId, onBlur };
}
