import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/apiUrl';
import { useUser } from './UserContext';
import type { AssistantMessage } from '../types/assistant';

type AssistantChatPanelProps = {
  open: boolean;
  onClose: () => void;
  mode: 'guide' | 'drafting';
};

type TicketLine = { key: string; label: string; required: boolean; filled: boolean };
type Progress = { lines: TicketLine[]; requiredTotal: number; requiredFilled: number; percent: number; complete: boolean };
type CriteriaDef = { key: string; label: string };
type ScoreReport = {
  score: number;
  label: string;
  criteria?: Record<string, number>;
  criteriaDefs?: CriteriaDef[];
  strengths?: string[];
  fixes?: string[];
  missingComponents?: string[];
};
type Download = { pdf: string; docx: string } | null;

const GREETING =
  "Hi, I'm Steve — your grant concierge. Tell me about the grant you need and I'll take your order: I'll ask for whatever's missing, write your grant letter, score it, and hand it over ready to download.";

const createMessage = (role: AssistantMessage['role'], content: string): AssistantMessage => ({
  id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
});

const getToken = () => (typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '');

/** Plain text for the voice synthesizer — no HTML, URLs, or bullets. */
function speakable(text: string) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AssistantChatPanel({ open, onClose, mode }: AssistantChatPanelProps) {
  const navigate = useNavigate();
  const { user } = useUser() || {};
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createMessage('assistant', GREETING),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [scoreReport, setScoreReport] = useState<ScoreReport | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [download, setDownload] = useState<Download>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const token = getToken();
  const isSignedIn = Boolean(user?.email || token);
  const firstName = (user?.name || user?.email || '').split('@')[0].split(/[._\s-]+/)[0];

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  const showScorecard = Boolean(scoreReport && (draftId || progress?.complete));

  const speak = useCallback(
    (text: string) => {
      if (!speakReplies || typeof window === 'undefined' || !window.speechSynthesis) return;
      const clean = speakable(text).slice(0, 800);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.03;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [speakReplies],
  );

  /** Rehydrate an in-progress order when the panel opens. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/assistant/session${isSignedIn ? '' : '?userId=guest'}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success) return;

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (data.progress) setProgress(data.progress);
        if (data.scoreReport) setScoreReport(data.scoreReport);
        if (data.draftId) setDraftId(data.draftId);
        if (data.draftTitle) setDraftTitle(data.draftTitle);
        if (data.download) setDownload(data.download);
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      } catch {
        /* offline is fine — Steve still works in-session */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isSignedIn, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, scoreReport]);

  useEffect(() => {
    if (!open && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, [open]);

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
      window.setTimeout(() => inputRef.current?.focus(), 0);
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

  const submit = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;

      setMessages((current) => [...current, createMessage('user', message)]);
      setInput('');
      setLoading(true);
      setSuggestions([]);

      try {
        const res = await fetch(apiUrl('/api/assistant'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            userId: user?.id || user?.email || 'guest',
            tier: user?.tier || 'free',
            message,
            context: { mode, guestId: 'guest' },
          }),
        });

        const data = await res.json();
        const reply = data?.reply || 'Steve is unavailable right now.';

        setMessages((current) => [...current, createMessage('assistant', reply)]);
        if (data?.progress) setProgress(data.progress);
        if (data?.scoreReport) setScoreReport(data.scoreReport);
        if (data?.draftId) setDraftId(data.draftId);
        if (data?.draftTitle) setDraftTitle(data.draftTitle);
        setDownload(data?.download || null);
        if (Array.isArray(data?.suggestions)) setSuggestions(data.suggestions);
        speak(reply);
      } catch {
        setMessages((current) => [
          ...current,
          createMessage('assistant', "I couldn't reach the server. Check your connection and try again."),
        ]);
      } finally {
        setLoading(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [loading, mode, speak, token, user],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(input);
  };

  const resetOrder = async () => {
    try {
      await fetch(apiUrl('/api/assistant/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: user?.id || 'guest' }),
      });
    } catch {
      /* ignore */
    }
    setMessages([createMessage('assistant', GREETING)]);
    setProgress(null);
    setScoreReport(null);
    setDraftId(null);
    setDraftTitle(null);
    setDownload(null);
    setSuggestions([]);
  };

  const scoreColor = !scoreReport
    ? '#94A3B8'
    : scoreReport.score >= 85
      ? '#059669'
      : scoreReport.score >= 70
        ? '#D4AF37'
        : scoreReport.score >= 55
          ? '#F59E0B'
          : '#DC2626';

  const criteria = useMemo(() => {
    if (!scoreReport?.criteria) return [];
    const defs = scoreReport.criteriaDefs || [];
    return Object.keys(scoreReport.criteria).map((key) => ({
      key,
      label: defs.find((def) => def.key === key)?.label || key,
      value: scoreReport.criteria?.[key] ?? 0,
    }));
  }, [scoreReport]);

  if (!open) return null;

  return (
    <aside
      aria-label="Steve — grant concierge"
      className="fixed inset-x-3 bottom-3 top-3 flex w-auto flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl transition-transform duration-300 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:h-[100dvh] sm:w-full sm:max-w-[460px] sm:rounded-none sm:border-y-0 sm:border-r-0"
      style={{ zIndex: 10050 }}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0A0F1A] px-4 py-3 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-base font-black text-[#0A0F1A]">
          S
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">Steve</p>
          <p className="truncate text-[11px] text-[#E8D28C]">
            {loading ? 'Working on your order…' : progress?.complete ? 'Ticket complete' : 'Your grant concierge'}
          </p>
        </div>
        <button
          type="button"
          aria-label={speakReplies ? 'Turn voice replies off' : 'Turn voice replies on'}
          onClick={() => {
            setSpeakReplies((v) => {
              if (v && typeof window !== 'undefined') window.speechSynthesis?.cancel();
              return !v;
            });
          }}
          className={`hidden h-9 w-9 items-center justify-center rounded-lg border text-sm transition sm:flex ${
            speakReplies ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#E8D28C]' : 'border-white/20 text-white/70 hover:text-white'
          }`}
          title={speakReplies ? 'Voice replies on' : 'Voice replies off'}
        >
          {speakReplies ? '🔊' : '🔈'}
        </button>
        <button
          type="button"
          onClick={resetOrder}
          className="hidden h-9 items-center rounded-lg border border-white/20 px-2.5 text-[11px] font-bold text-white/80 transition hover:text-white sm:flex"
          title="Start a new order"
        >
          New
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Steve"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-lg leading-none text-white/80 transition hover:text-white"
        >
          ×
        </button>
      </header>

      {/* Order ticket — the "whip cream?" line items */}
      {progress && (progress.requiredFilled > 0 || progress.complete) && (
        <div className="shrink-0 border-b border-[#E2E8F0] bg-[#F7F9FB] px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowTicket((v) => !v)}
            className="flex w-full items-center gap-3 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#003A8C]">Order</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]">
              <span
                className="block h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </span>
            <span className="text-[11px] font-bold tabular-nums text-[#64748B]">
              {progress.requiredFilled}/{progress.requiredTotal}
            </span>
            <span className="text-[10px] text-[#94A3B8]">{showTicket ? '▲' : '▼'}</span>
          </button>
          {showTicket && (
            <ul className="mt-2 grid gap-1">
              {progress.lines
                .filter((line) => line.required || line.filled)
                .map((line) => (
                  <li key={line.key} className="flex items-center gap-2 text-[12px]">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        line.filled ? 'bg-emerald-500 text-white' : 'border border-[#CBD5E1] text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={line.filled ? 'text-[#0A0F1A]' : 'text-[#94A3B8]'}>{line.label}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {/* Conversation */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F7F9FB] px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
              message.role === 'user'
                ? 'ml-auto rounded-br-sm bg-[#003A8C] text-white'
                : 'mr-auto rounded-bl-sm border border-[#E2E8F0] bg-white text-[#0A0F1A]'
            }`}
          >
            {message.content}
          </div>
        ))}

        {/* Ready-for-review card */}
        {showScorecard && scoreReport && (
          <div className="mr-auto w-full max-w-[95%] overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#0A0F1A] px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#E8D28C]">Ready for review</span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: `${scoreColor}22`, color: scoreColor }}>
                {scoreReport.score}/100 · {scoreReport.label}
              </span>
            </div>

            <div className="px-4 py-3">
              {draftTitle && <p className="mb-2 text-sm font-bold text-[#0A0F1A]">{draftTitle}</p>}

              {criteria.length > 0 && (
                <ul className="mb-3 grid gap-1.5">
                  {criteria.slice(0, 7).map((row) => (
                    <li key={row.key} className="flex items-center gap-2">
                      <span className="w-[132px] shrink-0 truncate text-[11px] text-[#64748B]">{row.label}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F6]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${row.value}%`, background: row.value >= 75 ? '#059669' : row.value >= 55 ? '#D4AF37' : '#F59E0B' }}
                        />
                      </span>
                      <span className="w-7 text-right text-[10px] tabular-nums text-[#94A3B8]">{row.value}</span>
                    </li>
                  ))}
                </ul>
              )}

              {Array.isArray(scoreReport.fixes) && scoreReport.fixes.length > 0 && (
                <div className="mb-3 rounded-xl bg-[#FFFBEB] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8960C]">To improve</p>
                  <ul className="mt-1 list-disc pl-4 text-[12px] leading-5 text-[#78350F]">
                    {scoreReport.fixes.slice(0, 3).map((fix, i) => (
                      <li key={i}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {download ? (
                  <>
                    <a
                      href={apiUrl(download.pdf)}
                      className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-bold text-[#0A0F1A] no-underline transition hover:brightness-105"
                    >
                      Download PDF
                    </a>
                    <a
                      href={apiUrl(download.docx)}
                      className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#0A0F1A] no-underline transition hover:border-[#D4AF37]"
                    >
                      Download DOCX
                    </a>
                    {draftId && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/workspace/${draftId}`);
                        }}
                        className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#003A8C] transition hover:border-[#003A8C]"
                      >
                        Open in editor
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-[12px] text-[#64748B]">
                    Sign in with a free account and I&apos;ll save this to your workspace so you can download it.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void submit('Make it stronger')}
                  className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#0A0F1A] transition hover:border-[#D4AF37]"
                >
                  Make it stronger
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mr-auto w-fit rounded-2xl rounded-bl-sm border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#64748B] shadow-sm">
            Steve is working…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies + composer */}
      <form onSubmit={onSubmit} className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        {suggestions.length > 0 && !loading && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void submit(chip)}
                className="rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-bold text-[#92400E] transition hover:bg-[#D4AF37]/20"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-stretch gap-2">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              aria-label={listening ? 'Stop listening' : 'Speak to Steve'}
              className={`flex w-12 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                listening
                  ? 'animate-pulse border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]'
                  : 'border-[#E2E8F0] text-[#003A8C] hover:border-[#D4AF37]'
              }`}
              title={listening ? 'Listening…' : 'Push to talk'}
            >
              🎤
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={listening ? 'Listening…' : 'Tell Steve what you need…'}
            className="min-w-0 flex-1 rounded-xl border border-[#E2E8F0] px-3.5 py-3 text-sm text-[#0A0F1A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#0A0F1A] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {!isSignedIn && (
          <p className="mt-2 text-[11px] text-[#64748B]">
            You can draft free — <a href="/signup" className="font-bold text-[#003A8C] no-underline">create an account</a> to save and download.
          </p>
        )}
      </form>
    </aside>
  );
}
