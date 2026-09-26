/**
 * OrderTicket — the "waffle maker"
 * ----------------------------------------------------------------------------
 * The visual payoff of the counter. Three stages, same panel:
 *
 *   1. INTAKE   the ticket fills line by line as Steve captures the order
 *   2. MAKING   the document is being written
 *   3. READY    the finished grant + Checkmate scorecard + download
 *
 * The user watches their order being made — that is what makes this feel like
 * a counter instead of a form.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import type { Progress, ScoreReport, Download, SteveStatus } from './useSteveConcierge';

type OrderTicketProps = {
  progress: Progress | null;
  status: SteveStatus;
  loading: boolean;
  draftTitle: string | null;
  docHtml: string | null;
  editedSections: string[];
  scoreReport: ScoreReport | null;
  download: Download;
  draftId: string | null;
  onImprove: () => void;
  onOpenEditor: () => void;
  onEmail: () => void;
  emailState: { sending: boolean; sentTo?: string; error?: string };
};

/**
 * Dependency-free HTML sanitizer. The document is LLM-generated and could be
 * viewed by someone other than its author (e.g. a consultant reviewing a
 * client's draft), so never trust it as markup.
 */
function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,style,form,meta,base').forEach((node) => node.remove());
    // Stable ids on the headings so the section rail can jump to them.
    doc.querySelectorAll('h2').forEach((heading) => {
      const id = slugify(heading.textContent || '');
      if (id && !heading.id) heading.id = `section-${id}`;
    });
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.replace(/\s/g, '').toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:') || value.startsWith('data:text/html')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  } catch {
    return '';
  }
}

function scoreColor(score: number) {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#D4AF37';
  if (score >= 55) return '#F59E0B';
  return '#DC2626';
}

export default function OrderTicket({
  progress,
  status,
  loading,
  draftTitle,
  docHtml,
  editedSections,
  scoreReport,
  download,
  draftId,
  onImprove,
  onOpenEditor,
  onEmail,
  emailState,
}: OrderTicketProps) {
  // Prefer the document headings; fall back to the section list the API returns
  // so the ticket still reaches "ready" if the backend hasn't shipped docHtml.
  const sections = useMemo(() => {
    const fromHtml = Array.from(String(docHtml || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim(),
    );
    return fromHtml.length > 0 ? fromHtml : editedSections;
  }, [docHtml, editedSections]);

  const safeHtml = useMemo(() => sanitizeHtml(docHtml || ''), [docHtml]);
  const isReady = Boolean(scoreReport && (docHtml || status === 'ready_for_review'));
  const previewRef = useRef<HTMLDivElement | null>(null);

  /**
   * Jump the document pane to a section.
   *
   * Scrolls the pane itself rather than using scrollIntoView, which would also
   * scroll the whole dashboard and leave the heading under the fixed header.
   */
  const jumpToSection = useCallback((name: string) => {
    const container = previewRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`#section-${slugify(name)}`);
    if (!target) return;
    const containerTop = container.getBoundingClientRect().top;
    const offset = target.getBoundingClientRect().top - containerTop;
    container.scrollTo({ top: container.scrollTop + offset - 8, behavior: 'smooth' });
  }, []);
  const isMaking = !isReady && (loading || status === 'drafting') && Boolean(progress?.complete);
  const required = progress?.lines.filter((line) => line.required) ?? [];

  const criteria = useMemo(() => {
    if (!scoreReport?.criteria) return [];
    const defs = scoreReport.criteriaDefs || [];
    return Object.keys(scoreReport.criteria).map((key) => ({
      key,
      label: defs.find((d) => d.key === key)?.label || key,
      value: scoreReport.criteria?.[key] ?? 0,
    }));
  }, [scoreReport]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
      <header className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#0A0F1A] px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#E8D28C]">
          {isReady ? 'Ready for review' : isMaking ? 'Making it' : 'Your order'}
        </span>
        {isReady && scoreReport && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-black"
            style={{ background: `${scoreColor(scoreReport.score)}22`, color: scoreColor(scoreReport.score) }}
          >
            {scoreReport.score}/100 · {scoreReport.label}
          </span>
        )}
        {!isReady && progress && (
          <span className="text-[11px] font-bold tabular-nums text-white/70">
            {progress.requiredFilled}/{progress.requiredTotal}
          </span>
        )}
      </header>

      {/* ── Stage 1: the ticket ── */}
      {!isReady && !isMaking && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {required.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] text-2xl">
                🧇
              </div>
              <p className="text-sm font-semibold text-[#0A0F1A]">Nothing on the ticket yet</p>
              <p className="mt-1 max-w-[240px] text-xs text-[#64748B]">
                Tell Steve what you need and the lines below fill in as you talk.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2">
              {required.map((line) => (
                <li
                  key={line.key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition ${
                    line.filled ? 'border-emerald-200 bg-emerald-50/60' : 'border-dashed border-[#CBD5E1] bg-white'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                      line.filled ? 'bg-emerald-500 text-white' : 'border border-[#CBD5E1] text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={`text-[13px] ${line.filled ? 'font-semibold text-[#0A0F1A]' : 'text-[#94A3B8]'}`}>
                    {line.label}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {progress && progress.requiredFilled > 0 && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
                <div
                  className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-[#64748B]">{progress.percent}% of the ticket filled</p>
            </div>
          )}
        </div>
      )}

      {/* ── Stage 2: making it ── */}
      {isMaking && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" />
            <span className="text-[13px] font-bold text-[#92400E]">Steve is writing your grant…</span>
          </div>
          <ul className="grid gap-2">
            {required.map((line) => (
              <li key={line.key} className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  ✓
                </span>
                <span className="text-[13px] font-semibold text-[#0A0F1A]">{line.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Stage 3: the finished grant ── */}
      {isReady && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 border-b border-[#E2E8F0] bg-[#FBFCFD]">
            {/* Section rail — click a section and the letter slides to it. */}
            {sections.length > 1 && (
              <nav
                aria-label="Jump to section"
                className="hidden w-[124px] shrink-0 overflow-y-auto border-r border-[#E2E8F0] bg-white py-2 sm:block"
              >
                {sections.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => jumpToSection(name)}
                    className="block w-full truncate px-3 py-1.5 text-left text-[11px] leading-5 text-[#475569] transition hover:bg-[#F1F5F9] hover:text-[#003A8C]"
                    title={name}
                  >
                    {name}
                  </button>
                ))}
              </nav>
            )}

            <div ref={previewRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {draftTitle && <p className="mb-2 text-sm font-bold text-[#0A0F1A]">{draftTitle}</p>}
              {sections.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1 sm:hidden">
                  {sections.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => jumpToSection(name)}
                      className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[10px] text-[#475569]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {safeHtml ? (
                <div
                  className="prose-sm [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-black [&_h2]:mt-3 [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-[#003A8C] [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_p]:text-[13px] [&_p]:leading-6 [&_p]:text-[#334155]"
                  dangerouslySetInnerHTML={{ __html: safeHtml }}
                />
              ) : (
                <ul className="grid gap-1">
                  {sections.map((name) => (
                    <li key={name} className="text-[13px] text-[#334155]">
                      ✓ {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="shrink-0 px-4 py-3">
            {criteria.length > 0 && (
              <ul className="mb-3 grid gap-1.5">
                {criteria.map((row) => (
                  <li key={row.key} className="flex items-center gap-2">
                    <span className="w-[122px] shrink-0 truncate text-[11px] text-[#64748B]">{row.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F6]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${row.value}%`,
                          background: row.value >= 75 ? '#059669' : row.value >= 55 ? '#D4AF37' : '#F59E0B',
                        }}
                      />
                    </span>
                    <span className="w-7 text-right text-[10px] tabular-nums text-[#94A3B8]">{row.value}</span>
                  </li>
                ))}
              </ul>
            )}

            {Array.isArray(scoreReport?.fixes) && scoreReport.fixes.length > 0 && (
              <div className="mb-3 rounded-xl bg-[#FFFBEB] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8960C]">To improve</p>
                <ul className="mt-1 list-disc pl-4 text-[12px] leading-5 text-[#78350F]">
                  {scoreReport.fixes.slice(0, 2).map((fix, i) => (
                    <li key={i}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {download ? (
                <>
                  <a
                    href={download.pdf}
                    className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-bold text-[#0A0F1A] no-underline transition hover:brightness-105"
                  >
                    Download PDF
                  </a>
                  <a
                    href={download.docx}
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#0A0F1A] no-underline transition hover:border-[#D4AF37]"
                  >
                    Download DOCX
                  </a>
                  {draftId && (
                    <>
                      <button
                        type="button"
                        onClick={onOpenEditor}
                        className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#003A8C] transition hover:border-[#003A8C]"
                      >
                        Open in editor
                      </button>
                      <button
                        type="button"
                        onClick={onEmail}
                        disabled={emailState.sending}
                        className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#0A0F1A] transition hover:border-[#D4AF37] disabled:opacity-60"
                      >
                        {emailState.sending ? 'Sending…' : 'Send to my email'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-[#64748B]">
                  Sign in with a free account and I&apos;ll save this so you can download it.
                </p>
              )}
              <button
                type="button"
                onClick={onImprove}
                className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#0A0F1A] transition hover:border-[#D4AF37]"
              >
                Make it stronger
              </button>
              {emailState.sentTo && (
                <p className="w-full text-[11px] font-semibold text-emerald-700">Sent to {emailState.sentTo}</p>
              )}
              {emailState.error && (
                <p className="w-full text-[11px] font-semibold text-amber-700">{emailState.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
