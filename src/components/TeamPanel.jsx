import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';

const MEMBERS = [
  { name: 'Alex Johnson',  role: 'Owner',    email: 'alex@org.com',  avatar: 'AJ' },
  { name: 'Maria Santos',  role: 'Editor',   email: 'maria@org.com', avatar: 'MS' },
  { name: 'David Kim',     role: 'Reviewer', email: 'david@org.com', avatar: 'DK' },
];

const COMMENTS = [
  { author: 'Maria Santos', text: 'Section 2 needs stronger impact metrics.', time: '2h ago' },
  { author: 'David Kim',    text: 'Budget narrative looks solid. Approved.',   time: '5h ago' },
];

export default function TeamPanel() {
  const navigate = useNavigate();
  const { user } = useUser() || {};
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('idle');
  const [inviteMsg, setInviteMsg] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(COMMENTS);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteStatus('loading');
    setInviteMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/team/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, inviterName: user?.email || 'GrantsMaster User' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Invite failed');
      setInviteStatus('success');
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      setInviteStatus('error');
      setInviteMsg(err.message);
    }
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments(prev => [{ author: user?.email || 'You', text: comment, time: 'Just now' }, ...prev]);
    setComment('');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="text-[#E8D28C] text-sm mb-4 flex items-center gap-1 hover:opacity-80 transition bg-transparent border-none cursor-pointer p-0">
            ← Back
          </button>
          <h2 className="text-3xl font-bold">Team Collaboration</h2>
          <p className="text-[#E8D28C] mt-1">Comments, roles, and activity</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        {/* Comments */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <h3 className="text-xl font-bold text-[#003A8C] mb-4">Comments</h3>
          <div className="flex flex-col gap-4 mb-4">
            {comments.map((c, i) => (
              <div key={i} className="bg-[#F7F9FB] rounded-lg p-4 border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-[#003A8C]">{c.author}</span>
                  <span className="text-xs text-gray-400">{c.time}</span>
                </div>
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Add a comment…"
            className="w-full p-3 rounded-lg bg-[#F7F9FB] border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#D4AF37] transition resize-none h-20" />
          <button onClick={handleComment}
            className="mt-2 px-4 py-2 bg-[#D4AF37] text-[#0A0F1A] rounded-lg font-bold text-sm shadow hover:shadow-md transition">
            Post Comment
          </button>
        </div>

        {/* Members */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#003A8C]">Team Members</h3>
          </div>
          <div className="flex flex-col gap-3 mb-6">
            {MEMBERS.map(m => (
              <div key={m.email} className="flex items-center gap-4 p-3 bg-[#F7F9FB] rounded-lg border border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center text-[#0A0F1A] font-bold text-sm flex-shrink-0">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0A0F1A] text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">{m.role}</span>
              </div>
            ))}
          </div>

          {/* Invite form */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#003A8C', marginBottom: 8 }}>Invite a team member</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@email.com" type="email"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: '1.5px solid #E2E8F0', outline: 'none',
                  background: '#F7F9FB', color: '#1A202C',
                }}
                onFocus={e => e.target.style.borderColor = '#D4AF37'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <button onClick={handleInvite} disabled={inviteStatus === 'loading'}
                style={{
                  padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#003A8C', color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: inviteStatus === 'loading' ? .7 : 1,
                }}>
                {inviteStatus === 'loading' ? '…' : 'Send'}
              </button>
            </div>
            {inviteMsg && (
              <p style={{ fontSize: 12, marginTop: 6, color: inviteStatus === 'success' ? '#16A34A' : '#EF4444' }}>
                {inviteMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
