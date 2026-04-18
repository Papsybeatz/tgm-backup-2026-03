import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceDraftEditor({ title = 'New Grant Draft' }) {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/dashboard')}
            className="text-[#E8D28C] text-sm mb-4 flex items-center gap-1 hover:opacity-80 transition bg-transparent border-none cursor-pointer p-0">
            ← Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-[#E8D28C] mt-1">AI-powered drafting & revision</p>
        </div>
      </div>

      {/* EDITOR */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#D4AF37] p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E2E8F0]">
            <div className="flex gap-2">
              {['Bold','Italic','Heading','List'].map(tool => (
                <button key={tool}
                  className="px-3 py-1.5 text-xs font-semibold text-[#003A8C] bg-[#F7F9FB] border border-[#E2E8F0] rounded-lg hover:border-[#D4AF37] transition">
                  {tool}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave}
                className="px-5 py-2 bg-[#D4AF37] text-[#0A0F1A] rounded-lg font-bold text-sm shadow hover:shadow-md transition">
                {saved ? '✓ Saved' : 'Save Draft'}
              </button>
              <button className="px-5 py-2 bg-[#003A8C] text-white rounded-lg font-bold text-sm hover:opacity-90 transition">
                AI Improve ✦
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-[500px] p-4 rounded-lg bg-[#F7F9FB] text-gray-800 focus:outline-none border border-[#E2E8F0] focus:border-[#D4AF37] transition resize-none text-sm leading-relaxed"
            placeholder="Start writing your grant proposal here, or click 'AI Improve' to generate content…"
          />
          <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
            <span>{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</span>
            <span className="text-[#D4AF37] font-semibold">✦ AI Engine Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
