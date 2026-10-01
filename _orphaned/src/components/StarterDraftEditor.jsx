import React, { useState } from 'react';

const StarterDraftEditor = () => {
  const [draft, setDraft] = useState('');

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>Your Starter Grant Workspace</h1>
      <p>You have access to 5 drafts per month, downloads, and 1 team seat.</p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Type your grant draft here…"
        rows={12}
        style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '1rem', borderRadius: 6, border: '1px solid #ccc', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
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
        <button
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          // Not wired yet
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default StarterDraftEditor;
