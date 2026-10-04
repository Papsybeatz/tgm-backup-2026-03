/**
 * SteveCounter — the dashboard fusion
 * ----------------------------------------------------------------------------
 * The dashboard's front door. The itemized intake form on the left, the
 * "waffle maker" on the right showing the order as it is assembled and handed
 * over. The existing dashboard content sits underneath, untouched.
 *
 * The conversational counter it replaced is still reachable through the API
 * (`POST /api/assistant`), but the default intake is now the form: it costs one
 * writing pass instead of a 12–15 call conversation, and a dropdown stops the
 * "I already said it's a school" bug class outright.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderTicket from './OrderTicket';
import SteveIntakeForm from './SteveIntakeForm';
import SteveCorner from '../dashboard/SteveCorner';
import { useSteveConcierge } from './useSteveConcierge';
import SteveErrorBoundary from './SteveErrorBoundary';

export default function SteveCounter() {
  const c = useSteveConcierge();
  const navigate = useNavigate();
  const [showTicketOnMobile, setShowTicketOnMobile] = useState(false);

  // The ticket must describe the order the applicant is actually building. Before
  // a draft exists that is the form, so an empty form reads 0% — showing the
  // server session's leftover order here is what made an untouched form look
  // 22% filled. After a draft exists the server ticket is the truth.
  const shownProgress = c.docHtml ? c.progress : c.formProgress;

  const ticketProps = {
    progress: shownProgress,
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
    onEmail: () => void c.sendToEmail(),
    emailState: c.emailState,
    // email_delivery is on every tier except Free, so the button is hidden
    // rather than shown-then-refused.
    emailEnabled: c.tier !== 'free',
  };

  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'steve';

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
                ? 'Writing your grant…'
                : c.docHtml
                  ? 'Draft ready for review'
                  : 'Fill the order once and Steve writes the grant'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowTicketOnMobile((v) => !v)}
            className="h-9 rounded-lg border border-white/25 px-3 text-xs font-bold text-white/80 transition hover:text-white lg:hidden"
          >
            {showTicketOnMobile ? 'Hide draft' : 'Show draft'}
          </button>
        </div>

        {/* Degraded-engine notice: internal only, behind ?debug=steve. */}
        {c.engine === 'planner' && isDebug && (
          <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
            <span className="font-bold">Debug (internal only):</span> engine=planner
            {c.llmError ? <> — <span className="font-mono">{c.llmError}</span></> : null}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── The counter: itemized intake ── */}
          <div className="flex flex-col gap-4">
            <SteveErrorBoundary>
              <SteveIntakeForm
                form={c.form}
                onField={c.setField}
                onSubmit={() => void c.submitOrder()}
                onNextClient={() => void c.clearForm()}
                loading={c.loading}
                error={c.orderError}
                hasDraft={Boolean(c.docHtml)}
              />
            </SteveErrorBoundary>
            <SteveErrorBoundary>
              <SteveCorner />
            </SteveErrorBoundary>
          </div>

          {/* ── The waffle maker: order ticket ── */}
          <SteveErrorBoundary onError={() => setShowTicketOnMobile(false)}>
            <div className={`${showTicketOnMobile ? 'block' : 'hidden'} min-h-[420px] lg:block`}>
              <OrderTicket {...ticketProps} />
            </div>
          </SteveErrorBoundary>
        </div>

        {/* Mobile progress bar mirrors the ticket. */}
        {shownProgress && (
          // lg:hidden sits on a wrapper with no `flex` class: src/index.css ships
          // an unlayered .flex that would otherwise beat Tailwind's layered
          // lg:hidden and leak this mobile bar onto desktop.
          <div className="mt-3 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#E8D28C]">Your order</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <span
                  className="block h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                  style={{ width: `${shownProgress.percent}%` }}
                />
              </span>
              <span className="text-[11px] font-bold tabular-nums text-white/70">
                {`${shownProgress.requiredFilled}/${shownProgress.requiredTotal}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
