import React from 'react';

export function AIPanel({ selectedText, onApply }) {
  return (
    <aside style={{ width: 320, borderLeft: '1px solid #e5e7eb', padding: 16, background: 'var(--card, #fff)' }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>AI Assistant</div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Selected: {selectedText ? `${selectedText.slice(0, 60)}${selectedText.length > 60 ? '…' : ''}` : '—'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onApply((selectedText || '') + '\n\n[AI generated content]')} style={{ padding: 10 }}>Generate Section</button>
        <button onClick={() => onApply((selectedText || '') + '\n\n[Improved writing]')} style={{ padding: 10 }}>Improve Writing</button>
        <button onClick={() => onApply((selectedText || '') + '\n\n[Rewrite for clarity]')} style={{ padding: 10 }}>Rewrite for Clarity</button>
        <button onClick={() => onApply((selectedText || '') + '\n\n[Rewrite for impact]')} style={{ padding: 10 }}>Rewrite for Impact</button>
        <button onClick={() => onApply((selectedText || '') + '\n\n[Expand]')} style={{ padding: 10 }}>Expand</button>
        <button onClick={() => onApply((selectedText || '') + '\n\n[Shorten]')} style={{ padding: 10 }}>Shorten</button>
      </div>
    </aside>
  );
}

export default AIPanel;
