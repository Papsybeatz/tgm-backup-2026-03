import React, { useState, useCallback } from 'react';
import WorkspaceLayout from './WorkspaceLayout';
import EditorCard from './EditorCard';

export default function WorkspacePage() {
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [editorContent, setEditorContent] = useState('');

  const handleWordCount = useCallback((words, mins) => {
    setWordCount(words);
    setReadingTime(mins);
  }, []);

  const handleContentChange = useCallback((html) => {
    setEditorContent(html);
    setSaved(false);
    // Auto-save after 2s of inactivity
    clearTimeout(window._tgmSaveTimer);
    window._tgmSaveTimer = setTimeout(() => setSaved(true), 2000);
  }, []);

  const handleAIAction = useCallback(async (action) => {
    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'generate' ? '/api/ai/draft' : '/api/ai/improve';
      const body = action === 'generate'
        ? { prompt: title || 'Write a grant proposal', template: 'general' }
        : { content: editorContent, instruction: action };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      />
    </WorkspaceLayout>
  );
}
