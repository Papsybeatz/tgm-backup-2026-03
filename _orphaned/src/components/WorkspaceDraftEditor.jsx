import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CHECKLIST = [
  { id: 'inc',      label: 'Certificate of Incorporation',   tip: 'Proves your organisation is legally registered.' },
  { id: 'irs',      label: 'IRS 501(c)(3) Letter',           tip: 'Required by most US federal and private funders.' },
  { id: 'board',    label: 'Board Member List',              tip: 'Shows governance structure and credibility.' },
  { id: 'budget',   label: 'Organisational Budget',          tip: 'Demonstrates financial management capacity.' },
  { id: 'fin',      label: 'Past Financial Statements',      tip: 'Audited statements build funder confidence.' },
  { id: 'prog',     label: 'Programme Description',          tip: 'Clear description of what you do and for whom.' },
  { id: 'me',       label: 'Monitoring & Evaluation Plan',   tip: 'Shows how you measure and report impact.' },
  { id: 'impact',   label: 'Impact Metrics',                 tip: 'Quantified outcomes from past work.' },
  { id: 'photos',   label: 'Photos / Evidence',              tip: 'Visual proof of your work in the field.' },
  { id: 'reports',  label: 'Past Grant Reports',             tip: 'Demonstrates accountability to previous funders.' },
];

const TIPS = [
  { title: 'Strong Problem Statement',  body: 'Use data to quantify the problem. Funders fund solutions to proven problems, not assumptions.' },
  { title: 'Measurable Outcomes',       body: 'Replace vague goals ("help youth") with specific targets ("serve 200 youth, 80% improve grades").' },
  { title: 'Budget Structure',          body: 'Break costs into personnel, programme, overhead. Show cost-per-beneficiary where possible.' },
  { title: 'Sustainability Plan',       body: 'Explain how the programme continues after the grant ends. Funders hate one-and-done projects.' },
  { title: 'Demonstrate Credibility',   body: 'Cite past successes, partnerships, and team qualifications. Trust is earned before funding.' },
  { title: 'Align With Funder Goals',   body: 'Mirror the funder\'s language and priorities. Read their guidelines 3 times before writing.' },
];
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
  const location = useLocation();
  const { user } = useUser() || {};

  // Support opening an existing draft passed via router state
  const existingDraft = location?.state;
  const [draftTitle, setDraftTitle] = useState(existingDraft?.title || propTitle);
  const [draftId, setDraftId] = useState(existingDraft?.draftId || null);
  const [aiStatus, setAiStatus] = useState('idle');
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
    content: existingDraft?.content || '',
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
      let res;
      if (draftId) {
        res = await fetch(`/api/drafts/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: draftTitle, content }),
        });
      } else {
        res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: draftTitle, content }),
        });
        const data = await res.json();
        if (data.draft?.id) setDraftId(data.draft.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  }, [editor, draftTitle, draftId]);

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
  const [checkedItems, setCheckedItems] = useState({});
  const [activeTip, setActiveTip] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('checklist'); // 'checklist' | 'tips'

  const toggleCheck = (id) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
        padding: '28px 32px', color: '#fff',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
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

      {/* Editor + Sidebar — responsive: stacks on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .tgm-editor-layout { grid-template-columns: 1fr !important; }
          .tgm-editor-sidebar { display: none !important; }
          .tgm-toolbar { flex-wrap: wrap !important; }
        }
      `}</style>
      <div className="tgm-editor-layout" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
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

        {/* ── SIDEBAR ── */}
        <div className="tgm-editor-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tab switcher */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--tgm-surface)', borderRadius: 'var(--tgm-radius-md)',
            border: '1px solid var(--tgm-border)', overflow: 'hidden',
          }}>
            {[['checklist','📋 Checklist'],['tips','💡 Tips']].map(([key, label]) => (
              <button key={key} onClick={() => setSidebarTab(key)} style={{
                padding: '10px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: sidebarTab === key ? 'var(--tgm-navy)' : 'transparent',
                color: sidebarTab === key ? '#fff' : 'var(--tgm-muted)',
                transition: 'all .15s',
              }}>{label}</button>
            ))}
          </div>

          {/* Grant Readiness Checklist */}
          {sidebarTab === 'checklist' && (
            <div style={{
              background: 'var(--tgm-surface)', borderRadius: 'var(--tgm-radius-lg)',
              border: '1px solid var(--tgm-border)', boxShadow: 'var(--tgm-shadow-sm)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--tgm-border)',
                background: 'linear-gradient(135deg, var(--tgm-navy), var(--tgm-blue))',
              }}>
                <h3 style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Grant Readiness Checklist</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-gold-light)' }}>
                  {checkedCount}/{CHECKLIST.length} documents ready
                </p>
                {/* Progress bar */}
                <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,.15)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: 'var(--tgm-gold)',
                    width: `${(checkedCount / CHECKLIST.length) * 100}%`,
                    transition: 'width .3s ease',
                  }} />
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {CHECKLIST.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 16px', cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--tgm-bg)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => toggleCheck(item.id)}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      border: checkedItems[item.id] ? 'none' : '2px solid var(--tgm-border)',
                      background: checkedItems[item.id] ? 'var(--tgm-gold)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'var(--tgm-navy)', fontWeight: 800,
                      transition: 'all .15s',
                    }}>{checkedItems[item.id] ? '✓' : ''}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 2px', fontSize: 12, fontWeight: 600,
                        color: checkedItems[item.id] ? 'var(--tgm-muted)' : 'var(--tgm-navy)',
                        textDecoration: checkedItems[item.id] ? 'line-through' : 'none',
                      }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-muted)', lineHeight: 1.4 }}>{item.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grant Writing Tips */}
          {sidebarTab === 'tips' && (
            <div style={{
              background: 'var(--tgm-surface)', borderRadius: 'var(--tgm-radius-lg)',
              border: '1px solid var(--tgm-border)', boxShadow: 'var(--tgm-shadow-sm)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--tgm-border)',
                background: 'linear-gradient(135deg, var(--tgm-navy), var(--tgm-blue))',
              }}>
                <h3 style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Grant Writing Tips</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-gold-light)' }}>Click any tip to expand</p>
              </div>
              <div style={{ padding: '8px 0' }}>
                {TIPS.map((tip, i) => (
                  <div key={i}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', cursor: 'pointer', transition: 'background .15s',
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--tgm-bg)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setActiveTip(activeTip === i ? null : i)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: 'var(--tgm-gold)',
                        }}>{i + 1}</span>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--tgm-navy)' }}>{tip.title}</p>
                      </div>
                      <span style={{ color: 'var(--tgm-muted)', fontSize: 14, transition: 'transform .2s', transform: activeTip === i ? 'rotate(90deg)' : 'none' }}>›</span>
                    </div>
                    {activeTip === i && (
                      <div style={{
                        padding: '0 16px 14px 46px',
                        fontSize: 12, color: 'var(--tgm-muted)', lineHeight: 1.6,
                        borderBottom: i < TIPS.length - 1 ? '1px solid var(--tgm-border)' : 'none',
                      }}>{tip.body}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick action */}
          <div style={{
            background: 'linear-gradient(135deg, var(--tgm-navy), var(--tgm-blue))',
            borderRadius: 'var(--tgm-radius-md)', padding: '16px',
            border: '1px solid rgba(212,175,55,.2)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--tgm-gold)' }}>✦ AI Engine Ready</p>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
              Describe your mission and click Generate Draft for a complete proposal.
            </p>
            <button onClick={handleGenerate} disabled={aiStatus === 'loading'} style={{
              width: '100%', padding: '9px', borderRadius: 8,
              background: 'var(--tgm-gold)', border: 'none',
              color: 'var(--tgm-navy)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{aiStatus === 'loading' ? '✦ Generating…' : '✦ Generate Draft'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
