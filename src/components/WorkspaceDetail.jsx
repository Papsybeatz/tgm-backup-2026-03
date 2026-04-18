import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const WORKSPACES = {
  1: { name: 'Community Impact Grant',      status: 'In Progress' },
  2: { name: 'Youth Development Initiative', status: 'Review' },
  3: { name: 'Health Equity Proposal',       status: 'Draft' },
};

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ws = WORKSPACES[id] || { name: `Workspace ${id}`, status: 'Active' };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#003A8C] to-[#0A0F1A] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/dashboard')}
            className="text-[#E8D28C] text-sm mb-4 flex items-center gap-1 hover:opacity-80 transition bg-transparent border-none cursor-pointer p-0">
            ← Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold">{ws.name}</h2>
          <p className="text-[#E8D28C] mt-1">Manage drafts, documents, and collaboration</p>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
        {/* Drafts */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#D4AF37]">
          <h3 className="text-xl font-bold text-[#003A8C] mb-2">Drafts</h3>
          <p className="text-gray-500 text-sm mb-4">Your proposal drafts</p>
          <div className="bg-[#F7F9FB] p-4 rounded-lg text-gray-500 italic border border-[#E2E8F0] mb-4">
            Draft list appears here…
          </div>
          <button onClick={() => navigate('/workspace/new-draft')}
            className="w-full py-2.5 bg-[#D4AF37] text-[#0A0F1A] rounded-lg font-bold text-sm shadow hover:shadow-md transition">
            + New Draft
          </button>
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
