import React from 'react';

export default function DraftSectionCard({ title, description, value, onChange, showAssist }) {
  return (
    <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
        {showAssist && (
          <button className="ml-4 text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md">AI Assist</button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full min-h-[5.5rem] p-3 rounded-lg border border-gray-200 bg-white text-sm resize-y"
        placeholder={`Describe the ${title.toLowerCase()}...`}
      />
    </div>
  );
}
