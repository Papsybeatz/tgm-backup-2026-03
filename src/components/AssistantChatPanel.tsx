import React, { FormEvent, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import type { AssistantMessage } from '../types/assistant';
import { NY_ASSISTANT_PROMPTS } from '../data/newYorkGrants';

type AssistantChatPanelProps = {
  open: boolean;
  onClose: () => void;
};

type AssistantResponse = {
  reply: string;
  intent: string;
  requiresUpgrade?: boolean;
  upgradeLink?: string;
};

const SIGNED_OUT_DRAFT_REPLY = 'Great — I can help you write a new grant. To start drafting, you’ll need to create your free TGM workspace. Once you’re inside, I’ll guide you step‑by‑step, collect your project details, and generate your first draft. Click “Get Started Free” to open your workspace and we’ll begin.';

function createLocalMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

async function parseAssistantResponse(res: Response): Promise<AssistantResponse> {
  const text = await res.text();
  if (!text) throw new Error('TGM Assistant returned an empty response.');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}

export default function AssistantChatPanel({ open, onClose }: AssistantChatPanelProps) {
  const { user } = useUser() || {};
  const location = useLocation();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createLocalMessage('assistant', 'Hi, I am TGM Assistant. Ask me to draft a grant, improve a section, prepare a submission, or explain your funding readiness.'),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const userId = useMemo(() => user?.id || user?.userId || user?.email || 'guest', [user]);
  const tier = user?.tier || 'free';
  const isSignedIn = Boolean(user?.email || (typeof window !== 'undefined' && window.localStorage.getItem('token')));
  const showNewYorkPrompts = user?.location === 'new_york' || location.pathname.includes('new-york');

  const isDraftRequest = (message: string) => {
    const text = message.toLowerCase();
    return (
      (text.includes('write') && text.includes('grant')) ||
      (text.includes('draft') && text.includes('grant')) ||
      text.includes('new grant') ||
      text.includes('first draft')
    );
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = createLocalMessage('user', trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (!isSignedIn && isDraftRequest(trimmed)) {
        setMessages((current) => [
          ...current,
          createLocalMessage('assistant', SIGNED_OUT_DRAFT_REPLY),
        ]);
        return;
      }

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tier,
          message: trimmed,
          context: {
            currentPage: location.pathname,
            currentGrantId: location.pathname.startsWith('/workspace/') ? location.pathname.split('/').pop() : null,
            isSignedIn,
          },
        }),
      });
      const data = await parseAssistantResponse(response);
      if (!response.ok) throw new Error(data.reply || 'TGM Assistant failed to respond.');

      const upgradeCopy = data.requiresUpgrade && data.upgradeLink
        ? `\n\nTo use this feature, you will need the Pro or Unlimited tier. Upgrade here: ${data.upgradeLink}`
        : '';

      setMessages((current) => [
        ...current,
        createLocalMessage('assistant', `${data.reply}${upgradeCopy}`),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createLocalMessage('assistant', error instanceof Error ? error.message : 'TGM Assistant is unavailable right now.'),
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <aside
      aria-label="TGM Assistant chat panel"
      className={`fixed inset-x-3 bottom-3 top-3 z-50 flex w-auto flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl transition-transform duration-300 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:h-[100dvh] sm:w-full sm:max-w-[420px] sm:rounded-none sm:border-y-0 sm:border-r-0 ${
        open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)] sm:translate-x-full'
      }`}
    >
      <header className="relative flex shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#0A0F1A] px-5 py-4 pr-16 text-white">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[#E8D28C]">Concierge mode</p>
          <h2 className="text-lg font-bold">TGM Assistant</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close TGM Assistant"
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-2xl font-bold leading-none text-white transition hover:border-[#D4AF37] hover:text-[#E8D28C] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F7F9FB] px-4 py-4 sm:px-5 sm:py-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
              message.role === 'user'
                ? 'ml-auto bg-[#003A8C] text-white'
                : 'mr-auto border border-[#E2E8F0] bg-white text-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.role === 'assistant' && message.content === SIGNED_OUT_DRAFT_REPLY && (
              <a
                href="/signup"
                className="mt-3 inline-flex rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-bold text-[#0A0F1A] transition hover:bg-[#E8D28C]"
              >
                Get Started Free
              </a>
            )}
          </div>
        ))}
        {loading && (
          <div className="mr-auto w-fit rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
            TGM is thinking...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        {showNewYorkPrompts && (
          <div className="mb-3 flex flex-wrap gap-2">
            {NY_ASSISTANT_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#92400E] transition hover:bg-[#D4AF37]/20"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-stretch gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your question..."
            className="min-w-0 flex-1 rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#0A0F1A] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Type your question...</p>
      </form>
    </aside>
  );
}
