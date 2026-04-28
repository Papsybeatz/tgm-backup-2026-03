import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useUser } from '../UserContext';

function ToolBtn({ onClick, active, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded text-sm font-semibold border transition ${
        active
          ? 'bg-[#0A0F1A] text-white border-[#0A0F1A]'
          : 'bg-transparent text-[#0A0F1A] border-gray-200 hover:border-[#003A8C]'
      }`}
    >{children}</button>
  );
}

export default function EditorCard({ onContentChange, onWordCount, aiOutput }) {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Describe your organisation and grant goal, then use the AI Assistant to generate a full draft…' }),
      CharacterCount,
    ],
    onUpdate({ editor }) {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      onWordCount && onWordCount(words, Math.max(1, Math.ceil(words / 200)));
      onContentChange && onContentChange(editor.getHTML());
    },
  });

  // Inject AI output into editor when it arrives
  React.useEffect(() => {
    if (aiOutput && editor) {
      editor.commands.setContent(aiOutput);
    }
  }, [aiOutput, editor]);

  const saveContent = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const content = editor.getHTML();
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Untitled Draft', content }),
      });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  }, [editor]);

  if (!editor) return null;

  const words = editor.storage.characterCount?.words() ?? 0;
  const chars = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">B</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">• List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">1. List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">"</ToolBtn>
        <div className="flex-1" />
        <button
          onClick={saveContent}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-[#003A8C] text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <style>{`
          .tiptap { outline: none; min-height: 400px; font-size: 15px; line-height: 1.8; color: #1a1a2e; }
          .tiptap h2 { font-size: 1.4rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #0A0F1A; }
          .tiptap h3 { font-size: 1.1rem; font-weight: 600; margin: 1.2rem 0 0.4rem; color: #0A0F1A; }
          .tiptap p { margin: 0 0 0.8rem; }
          .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin-bottom: 0.8rem; }
          .tiptap blockquote { border-left: 3px solid #D4AF37; padding-left: 1rem; color: #555; font-style: italic; }
          .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #aaa; pointer-events: none; float: left; height: 0; }
        `}</style>
        <EditorContent editor={editor} className="tiptap" />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
        <span>{words} words · {chars} characters</span>
        <span className="text-[#D4AF37] font-semibold">✦ GrantsMaster AI Engine</span>
      </div>
    </div>
  );
}
