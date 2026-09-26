/**
 * SteveCounter — the dashboard fusion
 * ----------------------------------------------------------------------------
 * The dashboard's front door. A counter attendant on the left, the "waffle
 * maker" on the right showing the order being taken, then made, then handed
 * over. The existing dashboard content sits underneath, untouched.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderTicket from './OrderTicket';
import { useSteveConcierge } from './useSteveConcierge';
import SteveErrorBoundary from './SteveErrorBoundary';

export default function SteveCounter() {
  const c = useSteveConcierge();
  const navigate = useNavigate();
  const [showTicketOnMobile, setShowTicketOnMobile] = useState(false);
  const firstName = '';

  useEffect(() => {
    c.bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [c.messages, c.loading, c.scoreReport, c.bottomRef]);

  const ticketProps = {
    progress: c.progress,
    status: c.status,
    loading: c.loading,
    draftTitle: c.draftTitle,
    docHtml: c.docHtml,
    editedSections: c.editedSections,
    scoreReport: c.scoreReport,
    download: c.download,
    draftId: c.draftId,
    onImprove: () => void c.submit('Make it stronger'),
    onOpenEditor: () => {
      if (c.draftId) navigate(`/workspace/${c.draftId}`);
    },
  };

  return (
    <section className="border-b border-[#E2E8F0] bg-gradient-to-br from-[#0A0F1A] via-[#0A0F1A] to-[#003A8C]">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-7">
        {/* Header row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-lg font-black text-[#0A0F1A]">
            S
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold leading-tight text-white">Steve</h2>
              <span
                className={`h-1.5 w-1.5 rounded-full ${c.engine === 'agent' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                title={c.engine === 'agent' ? 'Full agent active' : 'Fallback engine — no LLM key configured'}
              />
            </div>
            <p className="truncate text-[12px] text-[#E8D28C]">
              {c.loading
                ? 'Working on your order…'
                : c.progress?.complete
                  ? 'Ticket complete'
                  : 'Your grant concierge — tell me what you need'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {c.speechSupported && (
              <button
                type="button"
                onClick={c.toggleListening}
                aria-label={c.listening ? 'Stop listening' : 'Speak to Steve'}
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
                  c.listening
                    ? 'animate-pulse border-[#DC2626] bg-[#DC2626]/20 text-white'
                    : 'border-white/25 text-white/80 hover:border-[#D4AF37] hover:text-white'
                }`}
              >
                <span>🎤</span>
                <span className="hidden sm:inline">{c.listening ? 'Listening…' : 'Speak'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => c.setSpeakReplies((v: boolean) => !v)}
              className={`hidden h-9 items-center rounded-lg border px-3 text-xs font-bold transition sm:flex ${
                c.speakReplies ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#E8D28C]' : 'border-white/25 text-white/70 hover:text-white'
              }`}
              title={c.speakReplies ? 'Voice replies on' : 'Voice replies off'}
            >
              {c.speakReplies ? '🔊' : '🔈'}
            </button>
            <button
              type="button"
              onClick={() => void c.reset()}
              className="h-9 rounded-lg border border-white/25 px-3 text-xs font-bold text-white/80 transition hover:text-white"
            >
              New
            </button>
          </div>
        </div>

        {/* Degraded-engine notice — the whole point is that this is never silent */}
        {c.engine === 'planner' && (
          <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
            <span className="font-bold">Basic engine active.</span> Natural-language mode is off
            {c.llmError ? <> — <span className="font-mono">{c.llmError}</span></> : ' — no LLM key configured'}.
            The ticket, the grant, scoring and downloads all still work.
          </div>
        )}

        {/* Mobile ticket toggle */}
        <button
          type="button"
          onClick={() => setShowTicketOnMobile((v) => !v)}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left lg:hidden"
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E8D28C]">Your order</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <span
              className="block h-full rounded-full bg-[#D4AF37] transition-all duration-500"
              style={{ width: `${c.progress?.percent ?? 0}%` }}
            />
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white/70">
            {c.progress ? `${c.progress.requiredFilled}/${c.progress.requiredTotal}` : '0/0'}
          </span>
        </button>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── The counter: conversation ── */}
          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-xl">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: 460 }}>
              {c.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'ml-auto rounded-br-sm bg-[#003A8C] text-white'
                      : 'mr-auto rounded-bl-sm border border-[#E2E8F0] bg-[#F7F9FB] text-[#0A0F1A]'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {c.loading && (
                <div className="mr-auto w-fit rounded-2xl rounded-bl-sm border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#64748B]">
                  Steve is working…
                </div>
              )}
              <div ref={c.bottomRef} />
            </div>

            <div className="shrink-0 border-t border-[#E2E8F0] px-3 py-3">
              {c.suggestions.length > 0 && !c.loading && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {c.suggestions.slice(0, 4).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void c.submit(chip)}
                      className="rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-bold text-[#92400E] transition hover:bg-[#D4AF37]/20"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void c.submit(c.input);
                }}
                className="flex items-stretch gap-2"
              >
                <input
                  value={c.input}
                  onChange={(event) => c.setInput(event.target.value)}
                  placeholder={c.listening ? 'Listening…' : 'Tell Steve what you need…'}
                  className="min-w-0 flex-1 rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 text-sm text-[#0A0F1A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
                <button
                  type="submit"
                  disabled={c.loading || !c.input.trim()}
                  className="shrink-0 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-[#0A0F1A] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </form>
              {!c.isSignedIn && (
                <p className="mt-2 text-[11px] text-[#64748B]">
                  You can draft free —{' '}
                  <a href="/signup" className="font-bold text-[#003A8C] no-underline">
                    create an account
                  </a>{' '}
                  to save and download.
                </p>
              )}
            </div>
          </div>

          {/* ── The waffle maker: order ticket ── */}
          <SteveErrorBoundary onError={() => setShowTicketOnMobile(false)}>
            <div className={`${showTicketOnMobile ? 'block' : 'hidden'} min-h-[420px] lg:block`}>
              <OrderTicket {...ticketProps} />
            </div>
          </SteveErrorBoundary>
        </div>
      </div>
    </section>
  );
}
