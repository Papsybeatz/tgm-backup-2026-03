import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useUser } from './UserContext';
import useAutosave from '../hooks/useAutosave';
import { tierAtLeast } from '../config/tiers';

const DEFAULT_SECTIONS = ['Section 1', 'Section 2', 'Section 3'];

function decodeHtmlEntities(value = '') {
  if (!value) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function normalizeAiHtml(raw = '') {
  if (!raw) return '';

  let input = String(raw).trim();

  // Remove markdown code fences if the model wraps HTML in ```html blocks.
  input = input.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Decode escaped HTML (e.g., &lt;h2&gt;Title&lt;/h2&gt;).
  if (/&lt;\/?[a-z][\s\S]*&gt;/i.test(input)) {
    input = decodeHtmlEntities(input);
  }

  // If AI returned a full HTML document, render only the body contents.
  if (/<!doctype|<html|<head|<body/i.test(input)) {
    const parsed = new window.DOMParser().parseFromString(input, 'text/html');
    const bodyHtml = parsed?.body?.innerHTML?.trim();
    if (bodyHtml) input = bodyHtml;
  }

  // Remove elements that should not be injected into the editable surface.
  input = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .trim();

  // If no HTML tags remain, present as readable paragraph text.
  if (!/<[a-z][\s\S]*>/i.test(input)) {
    return `<p>${input.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  }

  return input;
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const AI_GROUPS = [
  {
    title: 'Rewrite Tools',
    actions: [
      { label: 'Rewrite', action: 'rewrite' },
      { label: 'Improve Writing', action: 'improve' },
      { label: 'Rewrite for Clarity', action: 'clarity' },
      { label: 'Rewrite for Impact', action: 'impact' },
    ],
  },
  {
    title: 'Length Tools',
    actions: [
      { label: 'Expand', action: 'expand' },
      { label: 'Shorten', action: 'shorten' },
    ],
  },
  {
    title: 'Generation Tools',
    actions: [
      { label: 'Generate', action: 'generate' },
      {
        label: 'Generate Section',
        action: 'generate_section',
        requiresStarter: true,
        lockedHint: 'Upgrade to Starter to generate full sections.',
      },
    ],
  },
];

export default function DraftPage() {
  const [text, setText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [title, setTitle] = useState('Untitled Draft');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [newSection, setNewSection] = useState('');
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTIONS[0]);
  const [activeAction, setActiveAction] = useState('');
  const [showLockedDrawer, setShowLockedDrawer] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const [status, setStatus] = useState('Draft');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const editorRef = useRef(null);

  const { saving, saved, draftId, onBlur } = useAutosave({ content: text, title, draftId: null, debounceMs: 1500 });

  const words = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const characters = text.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  useEffect(() => {
    if (words === 0) {
      setStatus('Draft');
      return;
    }
    if (words < 200) {
      setStatus('In Progress');
      return;
    }
    setStatus('Ready');
  }, [words]);

  useEffect(() => {
    if (saved && !saving && text.trim()) {
      setLastSavedAt(new Date());
    }
  }, [saved, saving, text]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== text) {
      editorRef.current.innerHTML = text;
    }
  }, [text]);

  const canAccessGrantMatches = tierAtLeast(tier, 'starter');
  const isStarterPlus = tierAtLeast(tier, 'starter');
  const canSave = text.trim().length > 0;

  const statusClass = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[status];

  const addSection = () => {
    const cleaned = newSection.trim();
    if (!cleaned) return;
    setSections((prev) => [...prev, cleaned]);
    setActiveSection(cleaned);
    setNewSection('');
  };

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  const handleAIAction = async (label, action) => {
    setActiveAction(label);
    setAiError('');
    setAiLoading(true);

    try {
      const token = getToken();
      const isFreeGenerate = action === 'generate' && !isStarterPlus;
      const endpoint = isFreeGenerate
        ? '/api/ai/brainstorm'
        : action === 'generate' || action === 'generate_section'
          ? '/api/ai/draft'
          : '/api/ai/improve';

      const baseContent = selectedText || text || '';
      const plainContent = stripHtml(baseContent);
      const body = endpoint === '/api/ai/draft' || endpoint === '/api/ai/brainstorm'
        ? { prompt: plainContent || title || 'Write a grant proposal', template: 'general' }
        : { content: baseContent || title || 'Improve this grant draft', instruction: action };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const output =
        data?.rewritten ||
        data?.improved ||
        data?.clarity ||
        data?.draft ||
        data?.output ||
        data?.text ||
        data?.result ||
        data?.content ||
        '';

      if (!res.ok) {
        setAiError(data?.message || 'AI request failed. Please try again.');
        return;
      }

      if (output) {
        setText(endpoint === '/api/ai/brainstorm' ? normalizeAiHtml(output) : normalizeAiHtml(output));
      } else {
        setAiError('No AI output returned. Please try again.');
      }
    } catch (error) {
      setAiError('AI request failed. Please check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const savedAgo = useMemo(() => {
    if (!lastSavedAt) return 'Not yet';
    const diffMs = Math.max(0, nowTs - lastSavedAt.getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }, [lastSavedAt, nowTs]);

  const saveLabel = saving ? 'Saving...' : saved ? `Saved • ${savedAgo}` : 'Unsaved';
  const saveColor = saving ? 'text-amber-600' : saved ? 'text-emerald-600' : 'text-slate-500';
  const sectionIcons = ['📝', '📄', '📌', '🧭', '📊', '✅', '💡'];

  const handleManualSave = () => {
    if (!canSave) return;
    onBlur();
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <WorkspaceLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-[#EEF2F7] via-[#F5F7FB] to-[#EDF2F8]">
        <div className="border-b border-slate-200/90 border-t-2 border-t-[#D4AF37]/70 bg-white/95 px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <a
                href="/dashboard"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[#D4AF37] hover:text-[#0A0F1A]"
                aria-label="Back to dashboard"
              >
                ←
              </a>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={onBlur}
                placeholder="Untitled Draft"
                className="min-w-[220px] max-w-[560px] flex-1 border-none bg-transparent text-base font-bold tracking-tight text-[#0A0F1A] outline-none md:text-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide md:text-xs ${statusClass}`}>{status}</span>
              <span className={`font-semibold ${saveColor}`}>{saveLabel}</span>
              <span className="text-slate-500 tabular-nums">
                Last saved: {lastSavedAt ? `${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${savedAgo}` : 'Not yet'}
              </span>
              <button
                onClick={handleExportPdf}
                className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5"
              >
                Export PDF
              </button>
              <button
                onClick={handleManualSave}
                disabled={!canSave}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  canSave
                    ? 'bg-[#0A0F1A] text-[#D4AF37] hover:opacity-90'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 md:px-6 lg:grid-cols-[230px_1fr_300px]">
          <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sections</div>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeSection === section
                      ? 'bg-[#003A8C]/10 font-semibold text-[#003A8C] border-l-4 border-l-[#003A8C] border-y border-r border-[#003A8C]/20'
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className="mr-2">{sectionIcons[index % sectionIcons.length]}</span>
                  {section}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSection();
                }}
                placeholder="Add Section"
                className="mb-2.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
              />
              <button onClick={addSection} className="btn btn-secondary w-full !px-3 !py-2.5 !text-sm !font-semibold">
                Add Section
              </button>
            </div>
          </aside>

          <section className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {activeSection}
              </div>
              <div className="p-6">
                <h3 className="mb-3 text-base font-semibold text-[#0A0F1A]">{activeSection}</h3>
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Draft Metadata</p>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Free Tier Preview</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input disabled value="Grant Type: General Operating" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500" />
                    <input disabled value="Funder: Not set" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500" />
                    <input disabled value={`Status: ${status}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500" />
                    <input disabled value="Notes: Starter Feature" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500" />
                    <input disabled value="Draft Limit: 1 of 1 (Free Tier)" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:col-span-2" />
                  </div>
                </div>
                <style>{`
                  .tgm-html-editor {
                    min-height: 58vh;
                    width: 100%;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.75rem;
                    background: #fff;
                    padding: 20px;
                    font-size: 15px;
                    line-height: 1.6;
                    color: #1e293b;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
                    outline: none;
                    overflow: auto;
                    white-space: pre-wrap;
                    word-break: break-word;
                  }
                  .tgm-html-editor:focus {
                    border-color: #d4af37;
                  }
                  .tgm-html-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                  }
                  .tgm-html-editor h1, .tgm-html-editor h2, .tgm-html-editor h3 {
                    color: #0a0f1a;
                    margin: 0.8rem 0 0.4rem;
                  }
                  .tgm-html-editor p { margin: 0 0 0.75rem; }
                  .tgm-html-editor ul, .tgm-html-editor ol {
                    margin: 0 0 0.9rem;
                    padding-left: 1.2rem;
                  }
                `}</style>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Write your grant proposal here..."
                  className="tgm-html-editor"
                  onInput={(e) => setText(e.currentTarget.innerHTML)}
                  onMouseUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                  onKeyUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                  onBlur={onBlur}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/75 px-6 py-2.5 text-xs font-medium text-slate-500">
                <span>{words} words</span>
                <span>{readingTime} min read</span>
                <span>{characters} characters</span>
              </div>
            </div>
          </section>

          <aside className="order-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A0F1A]">AI Assistant</h2>
              <span className="text-xs text-slate-400">{aiLoading ? `Working: ${activeAction}` : activeAction || 'Ready'}</span>
            </div>

            {tier === 'free' && (
              <div className="mb-3 rounded-lg border border-[#003A8C]/20 bg-[#003A8C]/5 px-2.5 py-1.5 text-[11px] font-semibold text-[#003A8C]">
                Basic AI Tools (Free Tier)
              </div>
            )}

            {tier === 'free' && (
              <div className="mb-4 flex justify-end">
                <a
                  href="/upgrade"
                  className="rounded-[8px] bg-[#D4AF37] px-3.5 py-2 text-xs font-semibold text-[#003A8C] shadow-sm border-0 transition hover:brightness-95"
                >
                  Upgrade to Starter
                </a>
              </div>
            )}

            <div className="space-y-5">
              {AI_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.title}</p>
                  <div className="space-y-2">
                    {group.actions.map((item) => {
                      const locked = item.requiresStarter && !isStarterPlus;
                      return (
                      <button
                        key={item.label}
                        onClick={() => !locked && handleAIAction(item.label, item.action)}
                        title={locked ? item.lockedHint : undefined}
                        disabled={locked || aiLoading}
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition ${
                          locked
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10'
                        }`}
                      >
                        {aiLoading && activeAction === item.label ? 'Working...' : item.label}{locked ? ' (Starter)' : ''}
                      </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {aiError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>
            )}

            {canAccessGrantMatches && (
              <div className="mt-5 rounded-xl border border-[#D4AF37]/40 bg-[#FFFAEC] p-3.5 text-xs text-slate-700">
                <p className="font-semibold text-[#0A0F1A]">Grant Matches</p>
                <p className="mt-1">Available on your plan. Run matching from your premium tools.</p>
              </div>
            )}

            <button onClick={() => setShowLockedDrawer(true)} className="btn btn-secondary mt-5 w-full !px-3 !py-2.5 !text-sm !font-medium !text-slate-600 hover:!text-[#0A0F1A]">
              Upgrade for Advanced Tools
            </button>

            {draftId && (
              <p className="mt-3 text-[11px] text-slate-400">Draft ID: {draftId}</p>
            )}
          </aside>
        </div>
      </div>

      {showLockedDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-[#0A0F1A]">Upgrade to unlock</h3>
              <button
                onClick={() => setShowLockedDrawer(false)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-slate-300"
              >
                Close
              </button>
            </div>

            <ul className="space-y-2.5 text-sm text-slate-700">
              <li>Scoring</li>
              <li>Funder Matching</li>
              <li>Full AI Drafting</li>
              <li>Templates Library</li>
              <li>Multi-Section Generation</li>
              <li>Reviewer Engine</li>
              <li>Team Workspace</li>
            </ul>

            <a
              href="/upgrade"
              className="mt-4 block rounded-lg bg-[#0A0F1A] px-4 py-2 text-center text-sm font-semibold text-[#D4AF37]"
            >
              See Upgrade Options
            </a>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
