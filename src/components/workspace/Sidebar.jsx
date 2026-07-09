import React, { useState } from 'react';

const DEFAULT_SECTIONS = [
  'Executive Summary',
  'Problem Statement',
  'Project Description',
  'Goals & Objectives',
  'Budget Narrative',
  'Evaluation Plan',
];

export default function Sidebar({ activeSection, setActiveSection }) {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [adding, setAdding] = useState(false);
  const [newSection, setNewSection] = useState('');

  function addSection() {
    if (!newSection.trim()) return;
    setSections(s => [...s, newSection.trim()]);
    setNewSection('');
    setAdding(false);
  }

  function handleSectionClick(section) {
    setActiveSection && setActiveSection(section);
    window.dispatchEvent(new CustomEvent('tgm:section-select', { detail: { section } }));
  }

  return (
    <aside className="w-[230px] rounded-2xl border border-slate-200 bg-white flex flex-col flex-shrink-0 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <h3 className="text-[11px] font-bold text-[#0A0F1A] uppercase tracking-[0.14em]">Sections</h3>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSectionClick(s)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition mb-1 border ${
              activeSection === s
                ? 'bg-[#003A8C]/10 text-[#003A8C] font-semibold border-[#003A8C]/20'
                : 'text-slate-600 hover:bg-slate-50 border-transparent'
            }`}
          >
            <span className="text-gray-400 mr-2 text-xs">{String(i + 1).padStart(2, '0')}</span>
            {s}
          </button>
        ))}

        {/* Add section */}
        {adding ? (
          <div className="mt-3 px-2">
            <input
              autoFocus
              className="w-full text-sm border border-[#D4AF37] rounded-lg px-2.5 py-2 outline-none"
              placeholder="Section name…"
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAdding(false); }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={addSection} className="text-xs text-[#003A8C] font-semibold">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs text-gray-400">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-3 ml-2 text-[#003A8C] text-sm font-medium hover:text-[#D4AF37] transition"
          >
            + Add Section
          </button>
        )}
      </div>

      {/* Grant Readiness mini-checklist */}
      <div className="border-t border-slate-100 px-4 py-3.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2.5">Readiness</p>
        {['Mission statement', 'Budget attached', 'Team listed', 'Deadline noted'].map((item, i) => (
          <label key={i} className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 cursor-pointer">
            <input type="checkbox" className="accent-[#D4AF37]" />
            {item}
          </label>
        ))}
      </div>
    </aside>
  );
}
