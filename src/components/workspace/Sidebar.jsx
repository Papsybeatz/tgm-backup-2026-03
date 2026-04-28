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

  return (
    <aside className="w-60 border-r bg-white flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-xs font-bold text-[#0A0F1A] uppercase tracking-widest">Sections</h3>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveSection && setActiveSection(s)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition mb-0.5 ${
              activeSection === s
                ? 'bg-[#003A8C]/10 text-[#003A8C] font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-gray-400 mr-2 text-xs">{String(i + 1).padStart(2, '0')}</span>
            {s}
          </button>
        ))}

        {/* Add section */}
        {adding ? (
          <div className="mt-2 px-2">
            <input
              autoFocus
              className="w-full text-sm border border-[#D4AF37] rounded px-2 py-1 outline-none"
              placeholder="Section name…"
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAdding(false); }}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={addSection} className="text-xs text-[#003A8C] font-semibold">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs text-gray-400">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 ml-2 text-[#003A8C] text-sm font-medium hover:text-[#D4AF37] transition"
          >
            + Add Section
          </button>
        )}
      </div>

      {/* Grant Readiness mini-checklist */}
      <div className="border-t px-4 py-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Readiness</p>
        {['Mission statement', 'Budget attached', 'Team listed', 'Deadline noted'].map((item, i) => (
          <label key={i} className="flex items-center gap-2 text-xs text-gray-500 mb-1 cursor-pointer">
            <input type="checkbox" className="accent-[#D4AF37]" />
            {item}
          </label>
        ))}
      </div>
    </aside>
  );
}
