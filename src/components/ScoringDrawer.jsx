import React, { useState } from 'react';

export function ScoringDrawer({ text, onFix }) {
  const [open, setOpen] = useState(false);

  const score = text ? Math.min(100, Math.max(20, Math.floor(text.length / 10))) : null;

  return (
    <div>
      <button onClick={() => setOpen(true)} style={{ padding: '8px 12px' }}>Score{score ? `: ${score}` : ''}</button>
      {open && (
        <div style={{ position: 'fixed', right: 16, top: 80, width: 360, maxHeight: '70vh', overflow: 'auto', background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Scoring</strong>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none' }}>Close</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <div>Overall: {score ?? 'N/A'}</div>
            <div style={{ marginTop: 8 }}>Strengths: Concise, focused</div>
            <div style={{ marginTop: 8 }}>Weaknesses: Add details, budget</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => { onFix({ updatedText: (text || '') + '\n\n[Suggested fix applied]' }); setOpen(false); }} style={{ padding: '8px 12px' }}>Apply Fix</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoringDrawer;
