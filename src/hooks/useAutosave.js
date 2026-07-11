import { useEffect, useRef, useState } from 'react';
import useAuth from './useAuth';

export default function useAutosave({ content, title, draftId, debounceMs = 700 }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const timer = useRef();
  const lastQueuedPayload = useRef(null);
  const lastSavedPayload = useRef(null);
  const pendingSave = useRef(false);
  const { token } = useAuth();

  useEffect(() => {
    if (draftId) setCurrentDraftId(draftId);
  }, [draftId]);

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
        lastSavedPayload.current = payload;
        setSaved(true);
      } else {
        console.warn('[useAutosave] save failed', res && res.status);
      }
    } catch {}
    pendingSave.current = false;
    setSaving(false);
  };

  const saveNow = () => {
    if (!token || !content) return;
    const payload = { title, content };

    // If no changes exist beyond the last successful save, do nothing.
    if (
      !pendingSave.current &&
      JSON.stringify(payload) === JSON.stringify(lastSavedPayload.current)
    ) {
      setSaved(true);
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    pendingSave.current = true;
    lastQueuedPayload.current = payload;
    saveDraft(payload);
  };

  // Debounced autosave on content/title/email change
  useEffect(() => {
    if (!token || !content) return;
    const payload = { title, content };

    // Avoid redundant scheduling when this exact payload is already queued/saved.
    if (
      JSON.stringify(payload) === JSON.stringify(lastQueuedPayload.current) ||
      JSON.stringify(payload) === JSON.stringify(lastSavedPayload.current)
    ) {
      return;
    }

    lastQueuedPayload.current = payload;
    pendingSave.current = true;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveDraft(payload), debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line
  }, [content, title, token]);

  // Save on blur
  const onBlur = () => saveNow();

  return { saving, saved, draftId: currentDraftId, onBlur, saveNow };
}
