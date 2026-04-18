import React from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_DOCS = [
  { name: 'Budget_Narrative_v2.pdf',    size: '142 KB', date: 'Apr 15, 2026', type: 'PDF' },
  { name: 'Logic_Model.docx',           size: '88 KB',  date: 'Apr 12, 2026', type: 'DOC' },
  { name: 'Org_Chart.png',              size: '320 KB', date: 'Apr 10, 2026', type: 'IMG' },
  { name: 'Letters_of_Support.pdf',     size: '210 KB', date: 'Apr 8, 2026',  type: 'PDF' },
];

const TYPE_COLORS = { PDF: '#EF4444', DOC: '#1D4ED8', IMG: '#16A34A' };

export default function DocumentViewer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="text-[#E8D28C] text-sm mb-4 flex items-center gap-1 hover:opacity-80 transition bg-transparent border-none cursor-pointer p-0">
            ← Back
          </button>
          <h2 className="text-3xl font-bold">Documents</h2>
          <p className="text-[#E8D28C] mt-1">Uploads & attachments</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#D4AF37] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
            <h3 className="font-bold text-[#003A8C]">All Documents</h3>
            <button className="px-4 py-2 bg-[#D4AF37] text-[#0A0F1A] rounded-lg font-bold text-sm shadow hover:shadow-md transition">
              + Upload
            </button>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {MOCK_DOCS.map(doc => (
              <div key={doc.name} className="flex items-center justify-between px-6 py-4 hover:bg-[#F7F9FB] transition">
                <div className="flex items-center gap-4">
                  <span style={{ background: TYPE_COLORS[doc.type] + '18', color: TYPE_COLORS[doc.type] }}
                    className="text-xs font-bold px-2 py-1 rounded-md w-10 text-center">
                    {doc.type}
                  </span>
                  <div>
                    <p className="font-semibold text-[#0A0F1A] text-sm">{doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.size} · {doc.date}</p>
                  </div>
                </div>
                <button className="text-sm font-semibold text-[#003A8C] hover:text-[#D4AF37] transition">
                  View →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
