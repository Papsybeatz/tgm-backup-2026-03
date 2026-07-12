import { useEffect, useRef, useState } from 'react';
import useAuth from './useAuth';
import { apiUrl } from '../lib/apiUrl';

export default function useAutosave({ content, title, draftId, debounceMs = 700 }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const timer = useRef();
  const lastQueuedPayload = useRef(null);
  const lastSavedPayload = useRef(null);
  const pendingSave = useRef(false);
  const { token } = useAuth();

  const getAuthToken = () => {
    if (token) return token;
    if (typeof window !== 'undefined') return localStorage.getItem('token') || '';
    return '';
  };

  useEffect(() => {
    if (draftId) setCurrentDraftId(draftId);
  }, [draftId]);

  // Save draft function
  const saveDraft = async (payload) => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    let success = false;
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        setSaveError('You are signed out. Please log in again to save.');
        success = false;
        return success;
      }
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      let res;
      if (currentDraftId) {
        res = await fetch(apiUrl(`/api/drafts/${currentDraftId}`), { method: 'PATCH', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
      } else {
        res = await fetch(apiUrl('/api/drafts'), { method: 'POST', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
      }
      if (res && res.ok) {
        const data = await res.json();
        const newId = data?.draft?.id || null;
        if (newId) setCurrentDraftId(newId);
        lastSavedPayload.current = payload;
        setSaved(true);
        success = true;
        return success;
      } else {
        setSaveError('Save failed. Please try again.');
        console.warn('[useAutosave] save failed', res && res.status);
        success = false;
        return success;
      }
    } catch {
      setSaveError('Network error while saving. Please try again.');
      success = false;
      return success;
    } finally {
      pendingSave.current = false;
      setSaving(false);
    }
  };

  const saveNow = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      setSaveError('You are signed out. Please log in again to save.');
      return false;
    }
    const payload = { title: title || '', content: content || '' };

    // If no changes exist beyond the last successful save, do nothing.
    if (
      !pendingSave.current &&
      JSON.stringify(payload) === JSON.stringify(lastSavedPayload.current)
    ) {
      setSaved(true);
      return true;
    }

    if (timer.current) clearTimeout(timer.current);
    pendingSave.current = true;
    lastQueuedPayload.current = payload;
    return saveDraft(payload);
  };

  // Debounced autosave on content/title/email change
  useEffect(() => {
    const authToken = getAuthToken();
    if (!authToken) return;
    const payload = { title: title || '', content: content || '' };

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
  const onBlur = () => {
    void saveNow();
  };

  return { saving, saved, saveError, draftId: currentDraftId, onBlur, saveNow };
}
