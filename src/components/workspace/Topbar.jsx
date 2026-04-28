import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';

export default function Topbar({ title, setTitle, saved, wordCount, readingTime }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const tier = user?.tier || 'free';

  const tierLabel = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    agency_starter: 'Agency',
    agency_unlimited: 'Agency+',
    lifetime: 'Lifetime',
  }[tier] || 'Free';

  const tierColor = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-[#003A8C]/10 text-[#003A8C]',
    agency_starter: 'bg-purple-100 text-purple-700',
    agency_unlimited: 'bg-purple-100 text-purple-700',
    lifetime: 'bg-[#D4AF37]/15 text-[#B8960C]',
  }[tier] || 'bg-gray-100 text-gray-600';

  return (
    <div className="h-14 border-b bg-white flex items-center px-6 justify-between flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-[#003A8C] transition mr-1"
          title="Back to Dashboard"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Draft title */}
        <input
          className="text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-[#D4AF37] transition w-64 text-[#0A0F1A] placeholder-gray-400"
          placeholder="Untitled Draft"
          value={title || ''}
          onChange={e => setTitle && setTitle(e.target.value)}
        />
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Draft</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{saved ? '✓ Saved' : 'Saving…'}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColor}`}>{tierLabel} Tier</span>
      </div>
    </div>
  );
}
