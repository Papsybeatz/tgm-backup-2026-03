import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useAutosave from '../hooks/useAutosave';

export default function DraftEditor() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [draftId, setDraftId] = useState(null);
  const [generating, setGenerating] = useState(false);
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

  async function handleSubmit() {
    if (!text.trim()) {
      alert('Please enter some content first.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: text, email: user?.email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.generatedDraft) {
          setText(data.generatedDraft);
          alert('Draft generated successfully!');
        } else {
          alert(data.message || 'Draft submitted!');
        }
      } else {
        alert(data.message || 'Failed to submit draft.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
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
        rows={15}
        cols={80}
        placeholder="Describe your grant idea, purpose, and key details here. The AI will generate a full draft based on your input."
        style={{ padding: '1rem', fontSize: '1rem', width: '100%', maxWidth: '800px', marginTop: '1rem' }}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={onBlur}
        disabled={generating}
      />
      <div style={{ marginTop: 8, minHeight: 24 }}>
        {saving && <span style={{ color: '#888' }}>Saving...</span>}
        {saved && <span style={{ color: '#28a745' }}>Saved</span>}
        {generating && <span style={{ color: '#007bff' }}>Generating draft with AI...</span>}
      </div>
      <button
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: generating ? '#6c757d' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: generating ? 'not-allowed' : 'pointer'
        }}
        onClick={handleSubmit}
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Generate Draft'}
      </button>
    </div>
  );
}
