import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';

const WS_META = {
  1: { name: 'Community Impact Grant',       status: 'In Progress' },
  2: { name: 'Youth Development Initiative', status: 'Review' },
  3: { name: 'Health Equity Proposal',       status: 'Draft' },
};

function DraftsList() {
  const { user } = useUser() || {};
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/drafts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) setDrafts(data.drafts || []);
        else setError(data.message || 'Failed to load drafts');
      })
      .catch(() => setError('Could not connect to server'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--tgm-muted)', fontSize: 13 }}>Loading drafts…</p>;
  if (error)   return <p style={{ color: 'var(--tgm-error)', fontSize: 13 }}>{error}</p>;
  if (!drafts.length) return (
    <p style={{ color: 'var(--tgm-muted)', fontSize: 13, fontStyle: 'italic' }}>
      No drafts yet — click "+ New Draft" to get started.
    </p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {drafts.map(d => (
        <div key={d.id} style={{
          padding: '12px 14px',
          background: 'var(--tgm-bg)',
          borderRadius: 'var(--tgm-radius-md)',
          border: '1px solid var(--tgm-border)',
          cursor: 'pointer',
          transition: 'border-color .15s',
        }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--tgm-gold)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--tgm-border)'}
          onClick={() => navigate('/workspace/new-draft', { state: { draftId: d.id, title: d.title, content: d.content } })}
        >
          <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--tgm-navy)' }}>
            {d.title || 'Untitled Draft'}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--tgm-muted)' }}>
            {new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {d.content?.replace(/<[^>]+>/g, '').slice(0, 60)}…
          </p>
        </div>
      ))}
    </div>
  );
}

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ws = WS_META[id] || { name: `Workspace ${id}`, status: 'Active' };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', color: '#E8D28C',
            fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12,
          }}>← Back to Dashboard</button>
          <h2 className="text-3xl font-bold">{ws.name}</h2>
          <p className="text-[#E8D28C] mt-1">Manage drafts, documents, and collaboration</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">

        {/* Drafts */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="text-xl font-bold text-[#003A8C]">Drafts</h3>
            <button onClick={() => navigate('/workspace/new-draft')} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: 'var(--tgm-gold)', border: 'none', color: 'var(--tgm-navy)', cursor: 'pointer',
            }}>+ New</button>
          </div>
          <DraftsList />
        </div>

        {/* Documents */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <h3 className="text-xl font-bold text-[#003A8C] mb-2">Documents</h3>
          <p className="text-gray-500 text-sm mb-4">Uploads & attachments</p>
          <div className="bg-[#F7F9FB] p-4 rounded-lg text-gray-500 italic border border-[#E2E8F0] mb-4">
            Document list appears here…
          </div>
          <Link to={`/workspace/${id}/documents`}
            className="block w-full py-2.5 bg-[#003A8C] text-white rounded-lg font-bold text-sm text-center no-underline hover:opacity-90 transition">
            View Documents
          </Link>
        </div>

        {/* Team */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <h3 className="text-xl font-bold text-[#003A8C] mb-2">Team</h3>
          <p className="text-gray-500 text-sm mb-4">Collaborators & comments</p>
          <div className="bg-[#F7F9FB] p-4 rounded-lg text-gray-500 italic border border-[#E2E8F0] mb-4">
            Team activity appears here…
          </div>
          <Link to="/workspace/team"
            className="block w-full py-2.5 bg-[#003A8C] text-white rounded-lg font-bold text-sm text-center no-underline hover:opacity-90 transition">
            Manage Team
          </Link>
        </div>
      </div>
    </div>
  );
}
