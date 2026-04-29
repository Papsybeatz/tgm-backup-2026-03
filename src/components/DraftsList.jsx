import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrafts } from '../lib/useDrafts';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function wordCount(html = '') {
  return html.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
}

export default function DraftsList() {
  const navigate = useNavigate();
  const { drafts, loading, error, createDraft, deleteDraft } = useDrafts();
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function handleNewDraft() {
    setCreating(true);
    const draft = await createDraft('Untitled Draft');
    setCreating(false);
    if (draft?.id) navigate(`/workspace/${draft.id}`);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteDraft(id);
    setDeletingId(null);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--tgm-navy)' }}>Your Drafts</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--tgm-muted)' }}>
            {loading ? 'Loading…' : `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleNewDraft}
          disabled={creating}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          {creating ? 'Creating…' : 'New Draft'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--tgm-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Empty state */}
      {!loading && drafts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--tgm-surface)', borderRadius: 'var(--tgm-radius-xl)',
          border: '2px dashed var(--tgm-border)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
          <p style={{ fontWeight: 700, color: 'var(--tgm-navy)', marginBottom: 6 }}>No drafts yet</p>
          <p style={{ fontSize: 13, color: 'var(--tgm-muted)', marginBottom: 20 }}>
            Start your first grant proposal — the AI will help you write it.
          </p>
          <button onClick={handleNewDraft} disabled={creating} className="btn-primary">
            {creating ? 'Creating…' : 'Create First Draft'}
          </button>
        </div>
      )}

      {/* Drafts grid */}
      {!loading && drafts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {drafts.map(draft => (
            <div
              key={draft.id}
              onClick={() => navigate(`/workspace/${draft.id}`)}
              style={{
                background: 'var(--tgm-surface)',
                border: '1px solid var(--tgm-border)',
                borderRadius: 'var(--tgm-radius-xl)',
                padding: '20px 20px 16px',
                cursor: 'pointer',
                transition: 'box-shadow .15s, border-color .15s',
                position: 'relative',
                opacity: deletingId === draft.id ? 0.4 : 1,
              }}
              onMouseOver={e => {
                e.currentTarget.style.boxShadow = 'var(--tgm-shadow-md)';
                e.currentTarget.style.borderColor = 'var(--tgm-gold)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--tgm-border)';
              }}
            >
              {/* Title */}
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15, color: 'var(--tgm-navy)', paddingRight: 28 }}>
                {draft.title || 'Untitled Draft'}
              </p>

              {/* Preview */}
              <p style={{
                margin: '0 0 14px', fontSize: 12, color: 'var(--tgm-muted)',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {draft.content
                  ? draft.content.replace(/<[^>]*>/g, '').slice(0, 120) || 'No content yet…'
                  : 'No content yet…'}
              </p>

              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--tgm-muted)' }}>
                    {wordCount(draft.content)} words
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--tgm-muted)' }}>
                    {timeAgo(draft.updatedAt || draft.updated_at)}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 10, background: 'rgba(0,58,140,.08)', color: 'var(--tgm-blue)',
                }}>Draft</span>
              </div>

              {/* Delete button */}
              <button
                onClick={e => handleDelete(e, draft.id)}
                title="Delete draft"
                style={{
                  position: 'absolute', top: 14, right: 14,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#D1D5DB', fontSize: 16, lineHeight: 1, padding: 2,
                  transition: 'color .15s',
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#EF4444'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#D1D5DB'; }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
