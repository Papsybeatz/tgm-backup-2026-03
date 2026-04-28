import React, { useState } from 'react';
import { useUser } from '../UserContext';
import { TIERS } from '../../config/tiers';

const AI_ACTIONS = [
  { label: 'Improve Writing',      action: 'improve',  tier: 'free' },
  { label: 'Rewrite for Clarity',  action: 'clarity',  tier: 'starter' },
  { label: 'Rewrite for Impact',   action: 'impact',   tier: 'starter' },
  { label: 'Expand',               action: 'expand',   tier: 'pro' },
  { label: 'Shorten',              action: 'shorten',  tier: 'pro' },
  { label: 'Generate Full Draft',  action: 'generate', tier: 'free' },
];

const TIER_ORDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];

function tierAllowed(userTier, requiredTier) {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export default function AIAssistant({ onAction, loading }) {
  const { user } = useUser();
  const tier = user?.tier || 'free';
  const [activeAction, setActiveAction] = useState(null);

  function handleClick(action, requiredTier) {
    if (!tierAllowed(tier, requiredTier)) return;
    setActiveAction(action);
    onAction && onAction(action);
  }

  return (
    <aside className="w-72 border-l bg-white flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <span className="text-[#D4AF37] text-lg">✦</span>
        <h3 className="text-xs font-bold text-[#0A0F1A] uppercase tracking-widest">AI Assistant</h3>
      </div>

      {/* Actions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {AI_ACTIONS.map(({ label, action, tier: requiredTier }) => {
          const allowed = tierAllowed(tier, requiredTier);
          const isActive = loading && activeAction === action;
          return (
            <button
              key={action}
              onClick={() => handleClick(action, requiredTier)}
              disabled={!allowed || loading}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-between ${
                allowed
                  ? action === 'generate'
                    ? 'btn-primary'
                    : 'btn-secondary'
                  : 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border border-gray-200'
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

      {/* Tips */}
      <div className="border-t px-4 py-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Writing Tips</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
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
