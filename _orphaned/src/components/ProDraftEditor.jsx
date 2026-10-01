import React, { useState } from 'react';

export default function ProDraftEditor() {
  const [text, setText] = useState('');
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Pro Grant Draft Editor</h1>
      <textarea
        rows={12}
        cols={80}
        placeholder="Type your grant draft here..."
        style={{ padding: '1rem', fontSize: '1rem', width: '100%', maxWidth: '800px', marginTop: '1rem' }}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
        onClick={() => alert('Draft submitted! Agent will process this next.')}
      >
        Generate Draft
      </button>
    </div>
  );
}
