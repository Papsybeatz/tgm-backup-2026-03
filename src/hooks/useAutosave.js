import { useEffect, useRef, useState } from 'react';
import useAuth from './useAuth';
import { apiUrl } from '../lib/apiUrl';

export default function useAutosave({ content, title, draftId, debounceMs = 700, enabled = true }) {
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

  useEffect(() => {
    if (enabled) return;
    if (timer.current) clearTimeout(timer.current);
    pendingSave.current = false;
  }, [enabled]);

  // Save draft function
  const saveDraft = async (payload) => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    let success = false;
    let requestUrl = '';
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
        requestUrl = apiUrl(`/api/drafts/${currentDraftId}`);
        res = await fetch(requestUrl, { method: 'PATCH', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
      } else {
        requestUrl = apiUrl('/api/drafts');
        res = await fetch(requestUrl, { method: 'POST', headers, body: JSON.stringify({ title: payload.title, content: payload.content }) });
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
        let backendMessage = '';
        try {
          const text = await res.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              backendMessage = parsed?.message || parsed?.error || text;
            } catch {
              backendMessage = text;
            }
          }
        } catch {
          backendMessage = '';
        }
        const suffix = backendMessage ? ` - ${backendMessage}` : '';
        setSaveError(`Save failed (${res.status}) at ${requestUrl}${suffix}`);
        console.warn('[useAutosave] save failed', { status: res && res.status, requestUrl, backendMessage });
        success = false;
        return success;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const pathHint = requestUrl || apiUrl('/api/drafts');
      setSaveError(`Network error while saving to ${pathHint}: ${message}`);
      console.warn('[useAutosave] network save error', { requestUrl: pathHint, message });
      success = false;
      return success;
    } finally {
      pendingSave.current = false;
      setSaving(false);
    }
  };

  const saveNow = async (options = {}) => {
    if (!enabled && !options.force) {
      setSaveError('Draft is still loading. Please try again in a moment.');
      return false;
    }
    const authToken = getAuthToken();
    if (!authToken) {
      setSaveError('You are signed out. Please log in again to save.');
      return false;
    }
    const payload = {
      title: options.title ?? title ?? '',
      content: options.content ?? content ?? '',
    };
    const force = Boolean(options.force);

    // If no changes exist beyond the last successful save, do nothing.
    if (
      !force &&
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
    if (!enabled) return;
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
  }, [content, title, token, enabled]);

  // Save on blur
  const onBlur = () => {
    void saveNow();
  };

  return { saving, saved, saveError, draftId: currentDraftId, onBlur, saveNow };
}
