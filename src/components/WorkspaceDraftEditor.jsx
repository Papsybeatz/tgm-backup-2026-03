import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useUser } from './UserContext';

/* ── Toolbar button ── */
function ToolBtn({ onClick, active, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        border: active ? 'none' : '1px solid var(--tgm-border)',
        background: active ? 'var(--tgm-navy)' : 'transparent',
        color: active ? '#fff' : 'var(--tgm-navy)',
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >{children}</button>
  );
}

export default function WorkspaceDraftEditor({ title: propTitle = 'New Grant Draft' }) {
  const navigate = useNavigate();
  const { user } = useUser() || {};
  const [draftTitle, setDraftTitle] = useState(propTitle);
  const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | error
  const [aiMsg, setAiMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Describe your organisation and grant goal, then click "Generate Draft" — or start writing directly…',
      }),
      CharacterCount,
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height:480px; padding:24px; outline:none; font-size:15px; line-height:1.8; color:#1A202C;',
      },
    },
  });

  /* ── Save draft to backend ── */
  const handleSave = useCallback(async () => {
    if (!editor) return;
    const content = editor.getHTML();
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: draftTitle, content }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  }, [editor, draftTitle]);

  /* ── Generate full draft from prompt ── */
  const handleGenerate = useCallback(async () => {
    if (!editor) return;
    const prompt = editor.getText().trim();
    if (!prompt) {
      setAiMsg('Type a description of your organisation and grant goal first.');
      setAiStatus('error');
      return;
    }
    setAiStatus('loading');
    setAiMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      const text = await res.text();
      if (!text) throw new Error('Empty response from server');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.message || 'AI generation failed');
      editor.commands.setContent(data.draft);
      setAiStatus('idle');
    } catch (err) {
      setAiStatus('error');
      setAiMsg(err.message);
    }
  }, [editor]);

  /* ── Improve existing content ── */
  const handleImprove = useCallback(async () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!editor.getText().trim()) {
      setAiMsg('Nothing to improve yet — write or generate a draft first.');
      setAiStatus('error');
      return;
    }
    setAiStatus('loading');
    setAiMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const text = await res.text();
      if (!text) throw new Error('Empty response from server');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.message || 'AI improve failed');
      editor.commands.setContent(data.output);
      setAiStatus('idle');
    } catch (err) {
      setAiStatus('error');
      setAiMsg(err.message);
    }
  }, [editor]);

  const words = editor?.storage?.characterCount?.words() ?? 0;
  const chars = editor?.storage?.characterCount?.characters() ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '28px 32px', color: '#fff',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', color: 'var(--tgm-gold-light)',
            fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12,
          }}>← Back to Dashboard</button>
          <input
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 26, fontWeight: 800, color: '#fff', width: '100%',
              borderBottom: '2px solid rgba(212,175,55,.4)', paddingBottom: 4,
            }}
            placeholder="Draft title…"
          />
          <p style={{ color: 'var(--tgm-gold-light)', fontSize: 13, marginTop: 6 }}>
            AI-powered grant drafting · {user?.email}
          </p>
        </div>
      </div>

      {/* Editor */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          background: 'var(--tgm-surface)',
          borderRadius: 'var(--tgm-radius-lg)',
          border: '1px solid var(--tgm-border)',
          boxShadow: 'var(--tgm-shadow-md)',
          overflow: 'hidden',
        }}>

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8,
            padding: '14px 20px',
            borderBottom: '1px solid var(--tgm-border)',
            background: 'var(--tgm-bg)',
          }}>
            {/* Format buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">B</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><em>I</em></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading">H2</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Sub-heading">H3</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">• List</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">1. List</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote">" "</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo">↩</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo">↪</ToolBtn>
            </div>

            {/* AI + Save buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={aiStatus === 'loading'}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--tgm-radius-md)',
                  background: 'var(--tgm-navy)', border: 'none',
                  color: 'var(--tgm-gold)', fontSize: 13, fontWeight: 700,
                  cursor: aiStatus === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: aiStatus === 'loading' ? .7 : 1,
                  boxShadow: 'var(--tgm-shadow-sm)',
                }}
              >{aiStatus === 'loading' ? '✦ Generating…' : '✦ Generate Draft'}</button>

              <button
                onClick={handleImprove}
                disabled={aiStatus === 'loading'}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--tgm-radius-md)',
                  background: 'var(--tgm-blue)', border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: aiStatus === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: aiStatus === 'loading' ? .7 : 1,
                }}
              >{aiStatus === 'loading' ? '✦ Improving…' : '✦ AI Improve'}</button>

              <button
                onClick={handleSave}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--tgm-radius-md)',
                  background: saved ? 'var(--tgm-success)' : 'var(--tgm-gold)',
                  border: 'none', color: 'var(--tgm-navy)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >{saved ? '✓ Saved' : 'Save'}</button>
            </div>
          </div>

          {/* AI status message */}
          {aiStatus === 'error' && aiMsg && (
            <div style={{
              padding: '10px 20px', background: 'rgba(239,68,68,.08)',
              borderBottom: '1px solid rgba(239,68,68,.2)',
              color: 'var(--tgm-error)', fontSize: 13,
            }}>{aiMsg}</div>
          )}

          {/* Tiptap editor */}
          <div style={{ minHeight: 480 }}>
            <style>{`
              .tiptap p { margin: 0 0 12px; }
              .tiptap h2 { font-size: 22px; font-weight: 700; color: var(--tgm-navy); margin: 24px 0 10px; }
              .tiptap h3 { font-size: 17px; font-weight: 600; color: var(--tgm-navy); margin: 18px 0 8px; }
              .tiptap ul, .tiptap ol { padding-left: 24px; margin: 0 0 12px; }
              .tiptap li { margin-bottom: 4px; }
              .tiptap blockquote { border-left: 3px solid var(--tgm-gold); padding-left: 16px; color: var(--tgm-muted); margin: 16px 0; }
              .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--tgm-muted); pointer-events: none; float: left; height: 0; }
            `}</style>
            <EditorContent editor={editor} className="tiptap" />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', borderTop: '1px solid var(--tgm-border)',
            background: 'var(--tgm-bg)', fontSize: 12, color: 'var(--tgm-muted)',
          }}>
            <span>{words} words · {chars} characters</span>
            <span style={{ color: 'var(--tgm-gold)', fontWeight: 600 }}>✦ GrantsMaster AI Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
