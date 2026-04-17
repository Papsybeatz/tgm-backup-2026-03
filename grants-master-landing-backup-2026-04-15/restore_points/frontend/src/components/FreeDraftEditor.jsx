import React, { useState } from 'react';

const FreeDraftEditor = () => {
  const [draft, setDraft] = useState('');

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>Your Free Grant Draft</h1>
      <p>Start writing your grant proposal below. You have 1 draft per month.</p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Type your grant draft here…"
        rows={12}
        style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '1rem', borderRadius: 6, border: '1px solid #ccc', resize: 'vertical' }}
      />
      <button
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
        // Not wired yet
      >
        Save Draft
      </button>
    </div>
  );
};

export default FreeDraftEditor;
