import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FUNDERS = [
  { id: 1, name: 'NEA Community Arts Fund',      match: 94, focus: 'Arts & Culture',    deadline: 'May 15, 2026', amount: '$50,000' },
  { id: 2, name: 'HUD Housing Initiative Grant', match: 88, focus: 'Housing & Equity',  deadline: 'Jun 1, 2026',  amount: '$250,000' },
  { id: 3, name: 'USDA Rural Development Fund',  match: 81, focus: 'Rural Communities', deadline: 'Jun 30, 2026', amount: '$100,000' },
  { id: 4, name: 'CDC Public Health Grant',       match: 76, focus: 'Health Equity',     deadline: 'Jul 15, 2026', amount: '$75,000' },
  { id: 5, name: 'DOE Clean Energy Initiative',  match: 71, focus: 'Environment',       deadline: 'Aug 1, 2026',  amount: '$500,000' },
  { id: 6, name: 'NSF STEM Education Fund',       match: 68, focus: 'Education',         deadline: 'Aug 30, 2026', amount: '$150,000' },
];

export default function FunderMatch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = FUNDERS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.focus.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/dashboard')}
            className="text-[#E8D28C] text-sm mb-4 flex items-center gap-1 hover:opacity-80 transition bg-transparent border-none cursor-pointer p-0">
            ← Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold">Funder Match Intelligence</h2>
          <p className="text-[#E8D28C] mt-1">AI-curated funder recommendations for your mission</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Search */}
        <div className="mb-8">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search funders by name or focus area…"
            className="w-full max-w-md px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#D4AF37] transition shadow-sm" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {filtered.map(f => (
            <div key={f.id} className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37] hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-[#003A8C] leading-tight">{f.name}</h3>
                <span className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: f.match >= 90 ? '#F0FDF4' : f.match >= 80 ? '#FEF9C3' : '#F7F9FB',
                           color:      f.match >= 90 ? '#166534' : f.match >= 80 ? '#92400E' : '#475569' }}>
                  {f.match}% match
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-1">Focus: <span className="font-semibold text-gray-600">{f.focus}</span></p>
              <p className="text-xs text-gray-400 mb-1">Amount: <span className="font-semibold text-[#003A8C]">{f.amount}</span></p>
              <p className="text-xs text-gray-400 mb-4">Deadline: <span className="font-semibold text-gray-600">{f.deadline}</span></p>
              <button className="w-full py-2.5 bg-[#D4AF37] text-[#0A0F1A] rounded-lg font-bold text-sm shadow hover:shadow-md transition">
                View Match →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
