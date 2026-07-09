import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';

export default function Topbar({ title, setTitle, saved, wordCount, readingTime }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const tier = user?.tier || 'free';
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    if (saved) {
      setLastSavedAt(new Date());
    }
  }, [saved]);

  const status = useMemo(() => {
    if ((wordCount || 0) === 0) return 'Draft';
    if ((wordCount || 0) < 200) return 'In Progress';
    return 'Ready';
  }, [wordCount]);

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

  const handleUploadDraft = () => {
    window.alert('Upload Draft (PDF, DOCX, Google Drive) is enabled for Starter and will be connected in this workspace flow.');
  };

  const statusClass = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[status];

  return (
    <div className="border-b border-slate-200/90 border-t-2 border-t-[#D4AF37]/70 bg-white/95 px-4 py-3 md:px-6 flex-shrink-0">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-[#D4AF37] hover:text-[#0A0F1A]"
          title="Back to Dashboard"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </button>
        {/* Draft title */}
        <input
          className="min-w-[220px] max-w-[560px] flex-1 border-none bg-transparent text-base font-bold tracking-tight text-[#0A0F1A] outline-none md:text-lg"
          placeholder="Untitled Draft"
          value={title || ''}
          onChange={e => setTitle && setTitle(e.target.value)}
        />
        <span className="rounded-full border border-[#003A8C]/20 bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#003A8C]">
          TGM Workspace - {tierLabel}
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide md:text-xs ${statusClass}`}>{status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
          <span className={saved ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{saved ? 'Saved' : 'Saving...'}</span>
          <span className="text-slate-500 tabular-nums">Last saved: {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</span>
          <span className="text-slate-500">{readingTime} min read</span>
          <button
            onClick={handleUploadDraft}
            className="rounded-lg border border-[#003A8C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003A8C] transition hover:border-[#003A8C] hover:bg-[#003A8C]/5"
          >
            Upload Draft (PDF, DOCX, Google Drive)
          </button>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColor}`}>{tierLabel} Tier</span>
        </div>
      </div>
    </div>
  );
}
