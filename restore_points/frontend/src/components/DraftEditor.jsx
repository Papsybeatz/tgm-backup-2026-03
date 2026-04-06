import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useAutosave from '../hooks/useAutosave';

export default function DraftEditor() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [draftId, setDraftId] = useState(null);
  const { saving, saved, draftId: autosavedId, onBlur } = useAutosave({
    content: text,
    title,
    email: user?.email,
    draftId,
  });

  // Update local draftId if autosave returns a new one
  React.useEffect(() => {
    if (autosavedId && autosavedId !== draftId) setDraftId(autosavedId);
  }, [autosavedId, draftId]);

  function handleSubmit() {
    alert('Draft submitted! Agent will process this next.');
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Grant Draft Editor</h1>
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', maxWidth: 800, marginBottom: 12, padding: 8, fontSize: '1.1rem' }}
        onBlur={onBlur}
      />
      <textarea
        rows={10}
        cols={80}
        placeholder="Type your grant draft here..."
        style={{ padding: '1rem', fontSize: '1rem', width: '100%', maxWidth: '800px', marginTop: '1rem' }}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={onBlur}
      />
      <div style={{ marginTop: 8, minHeight: 24 }}>
        {saving && <span style={{ color: '#888' }}>Saving...</span>}
        {saved && <span style={{ color: '#28a745' }}>Saved</span>}
      </div>
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
        onClick={handleSubmit}
      >
        Generate Draft
      </button>
    </div>
  );
}
