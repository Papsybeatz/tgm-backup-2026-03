import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceLayout from './WorkspaceLayout';
import EditorCard from './EditorCard';

function getToken() {
  return localStorage.getItem('token') || '';
}

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [loadError, setLoadError] = useState('');

  // Load existing draft by ID
  useEffect(() => {
    if (!id) return;
    setLoadError('');
    fetch(`/api/drafts/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        const d = data.draft || data;
        if (d?.id) {
          setDraft(d);
          setTitle(d.title || '');
          if (d.content) setAiOutput(d.content); // pre-fill editor
        } else {
          setLoadError('Draft not found.');
        }
      })
      .catch(() => setLoadError('Could not load draft.'));
  }, [id]);

  // Auto-save title when it changes
  useEffect(() => {
    if (!id || !draft) return;
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/drafts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ title }),
        });
      } catch (e) { /* silent */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, id, draft]);

  const handleWordCount = useCallback((words, mins) => {
    setWordCount(words);
    setReadingTime(mins);
  }, []);

  const handleContentChange = useCallback((html) => {
    setEditorContent(html);
    setSaved(false);
    clearTimeout(window._tgmSaveTimer);
    window._tgmSaveTimer = setTimeout(async () => {
      if (!id) return;
      try {
        await fetch(`/api/drafts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ content: html, title }),
        });
        setSaved(true);
      } catch (e) { setSaved(false); }
    }, 2000);
  }, [id, title]);

  const handleAIAction = useCallback(async (action) => {
    setAiLoading(true);
    try {
      const endpoint = action === 'generate' ? '/api/ai/draft' : '/api/ai/improve';
      const body = action === 'generate'
        ? { prompt: title || 'Write a grant proposal', template: 'general' }
        : { content: editorContent, instruction: action };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const output = data.draft || data.output || '';
      if (output) setAiOutput(output);
    } catch (e) {
      console.error('AI action failed', e);
    } finally {
      setAiLoading(false);
    }
  }, [title, editorContent]);

  // Error state
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--tgm-error)', fontSize: 16 }}>{loadError}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      title={title}
      setTitle={setTitle}
      saved={saved}
      wordCount={wordCount}
      readingTime={readingTime}
      onAIAction={handleAIAction}
      aiLoading={aiLoading}
    >
      <EditorCard
        onContentChange={handleContentChange}
        onWordCount={handleWordCount}
        aiOutput={aiOutput}
        draftId={id}
        initialTitle={title}
      />
    </WorkspaceLayout>
  );
}
