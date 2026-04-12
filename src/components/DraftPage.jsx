import React, { useState } from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { AIPanel } from './AIPanel';
import { ScoringDrawer } from './ScoringDrawer';
import { MatchingPanel } from './MatchingPanel';
import VersionsPanel from './VersionsPanel';
import { useUser } from './UserContext';
import useAutosave from '../hooks/useAutosave';

export default function DraftPage() {
  const [text, setText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [title, setTitle] = useState('Untitled Draft');
  const { user } = useUser() || {};

  const { saving, saved, draftId, onBlur } = useAutosave({ content: text, title, draftId: null, debounceMs: 1500 });

  const applyAI = (newText) => {
    setText(newText);
  };

  const applyFix = (fix) => {
    setText(fix.updatedText);
  };

  return (
    <WorkspaceLayout>
      <div style={{ display: 'flex', width: '100%' }}>
        {/* Left outline (placeholder) */}
        <div style={{ width: 260, borderRight: '1px solid #e5e7eb', padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Title</div>
          <input placeholder="Title (optional)" style={{ width: '100%', padding: 8, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Sections</div>
          <div style={{ fontSize: 13, color: '#555' }}>Section list (optional)</div>
        </div>

        {/* Center editor */}
        <div style={{ flex: 1, padding: 24 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={(e) => {
              const target = e.target;
              setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
            }}
            onBlur={() => onBlur()}
            placeholder="Write or paste your grant content here..."
            style={{ width: '100%', height: '70vh', padding: 12 }}
          />

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoringDrawer text={text} onFix={applyFix} />
            <div style={{ fontSize: 13, color: '#666' }}>{saving ? 'Saving…' : saved ? 'Saved' : ''}</div>
          </div>
        </div>

        {/* Right AI Panel */}
        <AIPanel selectedText={selectedText} onApply={applyAI} />
        {/* Versions panel */}
        <VersionsPanel draftId={draftId} onRestore={(content) => setText(content)} />
      </div>

      {/* Matching panel could be shown as a bottom or side drawer; include placeholder */}
      <div style={{ position: 'fixed', bottom: 16, left: 16 }}>
        <MatchingPanel draftId={null} />
      </div>
    </WorkspaceLayout>
  );
}
