import React, { useEffect, useMemo, useState } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useUser } from './UserContext';
import useAutosave from '../hooks/useAutosave';
import { tierAtLeast } from '../config/tiers';

const DEFAULT_SECTIONS = ['Section 1', 'Section 2', 'Section 3'];

const AI_GROUPS = [
  {
    title: 'Rewrite',
    actions: [
      { label: 'Improve Writing', template: '[Improved writing]\n' },
      { label: 'Rewrite for Clarity', template: '[Rewritten for clarity]\n' },
      { label: 'Rewrite for Impact', template: '[Rewritten for impact]\n' },
    ],
  },
  {
    title: 'Length',
    actions: [
      { label: 'Expand', template: '[Expanded draft section]\n' },
      { label: 'Shorten', template: '[Shortened draft section]\n' },
    ],
  },
  {
    title: 'Generate',
    actions: [{ label: 'Generate Section', template: '[Generated grant section]\n' }],
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
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const [status, setStatus] = useState('Draft');
  const [lastSavedAt, setLastSavedAt] = useState(null);

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

  const canAccessGrantMatches = tierAtLeast(tier, 'starter');

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

  const handleAIAction = (label, template) => {
    setActiveAction(label);
    const context = selectedText || text || '';
    const next = context ? `${context}\n\n${template}` : template;
    setText(next);
  };

  const saveLabel = saving ? 'Saving...' : saved ? 'Saved' : 'Unsaved';
  const saveColor = saving ? 'text-amber-600' : saved ? 'text-emerald-600' : 'text-slate-500';

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
                Last saved: {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 md:px-6 lg:grid-cols-[230px_1fr_300px]">
          <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sections</div>
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeSection === section
                      ? 'bg-[#003A8C]/10 font-semibold text-[#003A8C] border border-[#003A8C]/20'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
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
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onSelect={(e) => {
                    const target = e.target;
                    setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
                  }}
                  onBlur={onBlur}
                  placeholder="Write your grant proposal here..."
                  className="min-h-[58vh] w-full resize-y rounded-xl border border-slate-200 bg-white px-5 py-4 text-base leading-8 text-slate-800 outline-none focus:border-[#D4AF37]"
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
              <span className="text-xs text-slate-400">{activeAction || 'Ready'}</span>
            </div>

            <div className="space-y-5">
              {AI_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.title}</p>
                  <div className="space-y-2">
                    {group.actions.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleAIAction(item.label, item.template)}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {canAccessGrantMatches && (
              <div className="mt-5 rounded-xl border border-[#D4AF37]/40 bg-[#FFFAEC] p-3.5 text-xs text-slate-700">
                <p className="font-semibold text-[#0A0F1A]">Grant Matches</p>
                <p className="mt-1">Available on your plan. Run matching from your premium tools.</p>
              </div>
            )}

            <button onClick={() => setShowLockedDrawer(true)} className="btn btn-secondary mt-5 w-full !px-3 !py-2.5 !text-sm !font-medium !text-slate-600 hover:!text-[#0A0F1A]">
              View Locked Features
            </button>

            {tier === 'free' && (
              <a
                href="/upgrade"
                className="mt-2.5 block rounded-lg bg-[#0A0F1A] px-3 py-2.5 text-center text-sm font-semibold text-[#D4AF37] shadow-sm transition hover:opacity-90"
              >
                Upgrade Plan
              </a>
            )}

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
              <li>Grant Matching</li>
              <li>Scoring Engine</li>
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
