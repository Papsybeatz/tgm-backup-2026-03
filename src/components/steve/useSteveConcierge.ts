/**
 * useSteveConcierge — shared concierge engine
 * ----------------------------------------------------------------------------
 * One source of truth for the Steve conversation: order ticket progress, the
 * draft, the Checkmate report, downloads, and voice. Used by the dashboard
 * counter and (later) the floating panel, so behaviour cannot drift between
 * the two surfaces.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../../lib/apiUrl';
import { useUser } from '../UserContext';
import type { AssistantMessage } from '../../types/assistant';

export type TicketLine = { key: string; label: string; required: boolean; filled: boolean };
export type Progress = {
  lines: TicketLine[];
  requiredTotal: number;
  requiredFilled: number;
  percent: number;
  complete: boolean;
};
export type CriteriaDef = { key: string; label: string };
export type ScoreReport = {
  score: number;
  label: string;
  criteria?: Record<string, number>;
  criteriaDefs?: CriteriaDef[];
  strengths?: string[];
  fixes?: string[];
  missingComponents?: string[];
};
export type Download = { pdf: string; docx: string } | null;
export type SteveStatus = 'intake' | 'drafting' | 'ready_for_review' | 'delivered';

const GREETING =
  "Hi, I'm Steve — your grant concierge. Tell me what you need and I'll take your order: I ask for whatever's missing, write the proposal, score it, and hand it to you ready to download.";

const newMessage = (role: AssistantMessage['role'], content: string): AssistantMessage => ({
  id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
});

export function speakable(text: string) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useSteveConcierge(options: { autoRehydrate?: boolean } = {}) {
  const { autoRehydrate = true } = options;
  const { user } = useUser() || {};

  const [messages, setMessages] = useState<AssistantMessage[]>([newMessage('assistant', GREETING)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SteveStatus>('intake');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<string[]>([]);
  const [download, setDownload] = useState<Download>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [engine, setEngine] = useState<string>('agent');
  const [llmError, setLlmError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);

  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
  const isSignedIn = Boolean(user?.email || token);

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const applyPayload = useCallback((data: any) => {
    if (!data) return;
    if (data.progress) setProgress(data.progress);
    if (data.status) setStatus(data.status);
    if (data.scoreReport) setScoreReport(data.scoreReport);
    if (data.draftId) setDraftId(data.draftId);
    if (data.draftTitle) setDraftTitle(data.draftTitle);
    if (typeof data.docHtml === 'string') setDocHtml(data.docHtml);
    if (typeof data.hasDraft === 'boolean' && !data.hasDraft) setDocHtml(null);
    if (Array.isArray(data.editedSections)) setEditedSections(data.editedSections);
    if (data.download !== undefined) setDownload(data.download || null);
    if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
    if (data.engine) setEngine(data.engine);
    if (data.llmError !== undefined) setLlmError(data.llmError || null);
  }, []);

  /** Rehydrate an in-progress order. */
  useEffect(() => {
    if (!autoRehydrate) return;
    let cancelled = false;

    (async () => {
      try {
        const query = isSignedIn ? '' : '?userId=guest';
        const res = await fetch(apiUrl(`/api/assistant/session${query}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success) return;

        if (Array.isArray(data.messages) && data.messages.length > 0) setMessages(data.messages);
        applyPayload(data);
      } catch {
        /* offline is fine — the counter still works in-session */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoRehydrate, applyPayload, isSignedIn, token]);

  const speak = useCallback(
    (text: string) => {
      if (!speakReplies || typeof window === 'undefined' || !window.speechSynthesis) return;
      const clean = speakable(text).slice(0, 800);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.03;
      window.speechSynthesis.speak(utterance);
    },
    [speakReplies],
  );

  const submit = useCallback(
    async (raw: string) => {
      const message = String(raw || '').trim();
      if (!message || loading) return;

      setMessages((current) => [...current, newMessage('user', message)]);
      setInput('');
      setLoading(true);
      setSuggestions([]);

      try {
        const res = await fetch(apiUrl('/api/assistant'), {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            userId: user?.id || user?.email || 'guest',
            tier: user?.tier || 'free',
            message,
            context: { mode: 'drafting', guestId: 'guest' },
          }),
        });

        const data = await res.json();
        const reply = data?.reply || 'Steve is unavailable right now.';
        setMessages((current) => [...current, newMessage('assistant', reply)]);
        applyPayload(data);
        speak(reply);
      } catch {
        setMessages((current) => [
          ...current,
          newMessage('assistant', "I couldn't reach the server. Check your connection and try again."),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [applyPayload, authHeaders, loading, speak, user],
  );

  const reset = useCallback(async () => {
    try {
      await fetch(apiUrl('/api/assistant/reset'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: user?.id || 'guest' }),
      });
    } catch {
      /* ignore */
    }
    setMessages([newMessage('assistant', GREETING)]);
    setProgress(null);
    setScoreReport(null);
    setDraftId(null);
    setDraftTitle(null);
    setDocHtml(null);
    setEditedSections([]);
    setDownload(null);
    setSuggestions([]);
    setStatus('intake');
    setLlmError(null);
  }, [authHeaders, user]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) return;

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
      return;
    }

    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput((current) => (current ? `${current} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, speechSupported]);

  return {
    // state
    messages,
    input,
    loading,
    status,
    progress,
    scoreReport,
    draftId,
    draftTitle,
    docHtml,
    editedSections,
    download,
    suggestions,
    engine,
    llmError,
    listening,
    speakReplies,
    speechSupported,
    isSignedIn,
    tier: user?.tier || 'free',
    // actions
    setInput,
    setSpeakReplies,
    submit,
    reset,
    toggleListening,
    bottomRef,
  };
}
