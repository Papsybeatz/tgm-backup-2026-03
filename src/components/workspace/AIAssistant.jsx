import React, { useState } from 'react';
import { useUser } from '../UserContext';

const AI_GROUPS = [
  {
    title: 'Rewrite',
    actions: [
      { label: 'Rewrite', action: 'rewrite', tier: 'free' },
      { label: 'Improve Writing', action: 'improve', tier: 'free' },
      { label: 'Rewrite for Clarity', action: 'clarity', tier: 'starter' },
      { label: 'Rewrite for Impact', action: 'impact', tier: 'starter' },
    ],
  },
  {
    title: 'Length',
    actions: [
      { label: 'Expand', action: 'expand', tier: 'pro' },
      { label: 'Shorten', action: 'shorten', tier: 'pro' },
    ],
  },
  {
    title: 'Generate',
    actions: [{ label: 'Generate Section', action: 'generate', tier: 'free' }],
  },
];

const TIER_ORDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];

function tierAllowed(userTier, requiredTier) {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export default function AIAssistant({ onAction, loading }) {
  const { user } = useUser();
  const tier = user?.tier || 'free';
  const firstName = (user?.name || user?.email || 'there').split('@')[0].split(/[._\s-]+/)[0];
  const displayName = firstName ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}` : 'there';
  const [activeAction, setActiveAction] = useState(null);

  function handleClick(action, requiredTier) {
    if (!tierAllowed(tier, requiredTier)) return;
    setActiveAction(action);
    onAction && onAction(action);
  }

  const quickActions = [
    { label: 'Draft a Proposal', action: 'generate', tier: 'free' },
    { label: 'Improve a Section', action: 'improve', tier: 'free' },
    { label: 'Score My Draft', action: 'clarity', tier: 'starter' },
    { label: 'Check Funder Fit', action: 'impact', tier: 'starter' },
  ];

  return (
    <aside className="w-[300px] rounded-2xl border border-slate-200 bg-white flex flex-col flex-shrink-0 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <span className="text-[#D4AF37] text-lg">✦</span>
        <h3 className="text-[11px] font-bold text-[#0A0F1A] uppercase tracking-[0.14em]">AI Assistant</h3>
      </div>

      {/* Greeting + quick actions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="rounded-lg border border-[#003A8C]/20 bg-[#EFF6FF] px-3 py-2 text-xs font-medium text-[#003A8C]">
          Hi {displayName} - I'm Steve, your drafting assistant. Ready when you are.
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, action, tier: requiredTier }) => {
              const allowed = tierAllowed(tier, requiredTier);
              return (
                <button
                  key={label}
                  onClick={() => handleClick(action, requiredTier)}
                  disabled={!allowed || loading}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition ${
                    allowed
                      ? 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10'
                      : 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {AI_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.title}</p>
            <div className="space-y-2">
              {group.actions.map(({ label, action, tier: requiredTier }) => {
                const allowed = tierAllowed(tier, requiredTier);
                const isActive = loading && activeAction === action;
                return (
                  <button
                    key={action}
                    onClick={() => handleClick(action, requiredTier)}
                    disabled={!allowed || loading}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition flex items-center justify-between ${
                      allowed
                        ? 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10'
                        : 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    <span>{isActive ? 'Working…' : label}</span>
                    {!allowed && (
                      <span className="text-[10px] bg-[#D4AF37]/20 text-[#B8960C] px-1.5 py-0.5 rounded font-bold uppercase">
                        {requiredTier}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <span className="font-semibold text-slate-700">Grant Fit Score</span>
            <span className="font-semibold text-[#003A8C]">Ready to Analyze</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <span className="font-semibold text-slate-700">Missing Components</span>
            <span className="font-semibold text-[#003A8C]">Ready to Check</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <span className="font-semibold text-slate-700">Compliance Check</span>
            <span className="font-semibold text-emerald-700">Enabled</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
            <span className="font-semibold text-slate-700">Funder Ready</span>
            <span className="font-semibold text-emerald-700">Yes (8.4/10)</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="border-t border-slate-100 px-4 py-3.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">Writing Tips</p>
        <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
          <li>Lead with impact, not process</li>
          <li>Use funder's language</li>
          <li>Be specific with numbers</li>
        </ul>
      </div>

      {/* Upgrade CTA for free users */}
      {tier === 'free' && (
        <div className="border-t px-4 py-3 bg-[#0A0F1A]">
          <p className="text-xs text-gray-400 mb-2">Unlock all AI actions</p>
          <a
            href="/upgrade"
            className="block text-center text-xs font-bold bg-[#D4AF37] text-[#0A0F1A] px-3 py-2 rounded-lg hover:opacity-90 transition"
          >
            Upgrade to Starter →
          </a>
        </div>
      )}
    </aside>
  );
}
