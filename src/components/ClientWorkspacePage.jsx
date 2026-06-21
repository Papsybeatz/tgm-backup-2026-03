import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ClientSwitcher from './ClientSwitcher';

const TABS = ['Drafts', 'Templates', 'Reports', 'Documents', 'Permissions', 'Activity'];
const TEMPLATE_TYPES = [
  ['mission_statement', 'Mission statement'],
  ['organizational_background', 'Organizational background'],
  ['program_description', 'Program description'],
  ['budget_narrative', 'Budget narrative'],
  ['past_performance', 'Past performance'],
  ['needs_statement', 'Needs statement'],
];

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientWorkspacePage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [role, setRole] = useState('viewer');
  const [activeTab, setActiveTab] = useState('Drafts');
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [bulkReports, setBulkReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [forms, setForms] = useState({
    draftTitle: '',
    draftContent: '',
    templateType: 'mission_statement',
    templateTitle: '',
    templateContent: '',
    documentName: '',
    documentType: '',
    documentUrl: '',
    permissionEmail: '',
    permissionRole: 'viewer',
  });

  const canEdit = ['owner', 'editor'].includes(role);

  const loadClient = () => {
    setLoading(true);
    setError('');
    fetch(`/api/clients/${id}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || data.error || 'Could not load client');
        setClient(data.client);
        setRole(data.role || 'viewer');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClient();
    setSelectedDrafts([]);
    setBulkReports([]);
  }, [id]);

  const updateForm = (key, value) => setForms((current) => ({ ...current, [key]: value }));

  const post = async (path, body) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error || 'Request failed');
      loadClient();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createDraft = (event) => {
    event.preventDefault();
    post(`/api/clients/${id}/drafts`, { title: forms.draftTitle, content: forms.draftContent })
      .then((data) => {
        if (data) setForms((current) => ({ ...current, draftTitle: '', draftContent: '' }));
      });
  };

  const createTemplate = (event) => {
    event.preventDefault();
    post(`/api/clients/${id}/templates`, {
      type: forms.templateType,
      title: forms.templateTitle,
      content: forms.templateContent,
    }).then((data) => {
      if (data) setForms((current) => ({ ...current, templateTitle: '', templateContent: '' }));
    });
  };

  const createDocument = (event) => {
    event.preventDefault();
    post(`/api/clients/${id}/documents`, {
      name: forms.documentName,
      type: forms.documentType,
      url: forms.documentUrl,
    }).then((data) => {
      if (data) setForms((current) => ({ ...current, documentName: '', documentType: '', documentUrl: '' }));
    });
  };

  const addPermission = (event) => {
    event.preventDefault();
    post(`/api/clients/${id}/permissions`, {
      email: forms.permissionEmail,
      role: forms.permissionRole,
    }).then((data) => {
      if (data) setForms((current) => ({ ...current, permissionEmail: '', permissionRole: 'viewer' }));
    });
  };

  const runReport = (draftId) => post(`/api/clients/${id}/reports`, { draftId });

  const runBulkCheckmate = async () => {
    const data = await post('/api/clients/checkmate/bulk', { draftIds: selectedDrafts });
    if (data?.reports) {
      setBulkReports(data.reports);
      setActiveTab('Reports');
    }
  };

  const exportBulkCsv = async () => {
    const reportIds = bulkReports.map((report) => report.id);
    const res = await fetch('/api/clients/checkmate/bulk/export.csv', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ reportIds }),
    });
    const blob = await res.blob();
    downloadBlob(blob, 'tgm-bulk-checkmate-results.csv');
  };

  const exportReport = async (report, format = 'html') => {
    const suffix = format === 'html' ? 'export' : `export.${format}`;
    const res = await fetch(`/api/clients/${id}/reports/${report.id}/${suffix}`, {
      headers: authHeaders(),
    });
    const blob = await res.blob();
    downloadBlob(blob, `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-checkmate-report.${format}`);
  };

  const exportDraft = async (draft, format) => {
    const res = await fetch(`/api/drafts/${draft.id}/export.${format}`, {
      headers: authHeaders(),
    });
    const blob = await res.blob();
    downloadBlob(blob, `${(draft.title || 'client-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format}`);
  };

  const featureStatus = useMemo(() => ([
    ['Persistent client folders', true],
    ['Client drafts/templates/reports/documents/notes', true],
    ['Role-based permissions', true],
    ['Activity log', true],
    ['White-label Checkmate HTML export', true],
    ['Bulk Checkmate scoring and CSV export', true],
    ['Native PDF/DOCX binary export', false],
  ]), []);

  if (loading) return <div className="min-h-screen bg-slate-50 px-6 py-12 text-sm text-slate-600">Loading client workspace...</div>;
  if (error && !client) return <div className="min-h-screen bg-slate-50 px-6 py-12 text-sm font-semibold text-red-700">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Link to="/clients" className="text-sm font-bold text-[#003A8C] no-underline">All clients</Link>
              <ClientSwitcher currentClientId={id} />
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">{role}</span>
            </div>
            <h1 className="text-3xl font-bold text-[#003A8C]">{client.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {[client.sector, client.state].filter(Boolean).join(' / ') || 'Add sector and state metadata'}.
              {client.notes ? ` ${client.notes}` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm md:min-w-[260px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">White-label brand</p>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: client.brandColor || '#003A8C' }} />
              <div>
                <p className="font-bold text-slate-900">{client.contactInfo || 'Contact info not set'}</p>
                <p className="text-xs text-slate-500">{client.brandLogoUrl ? 'Logo URL saved' : 'No logo saved'}</p>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          {[
            ['Drafts', client.drafts?.length || 0],
            ['Templates', client.templates?.length || 0],
            ['Reports', client.reports?.length || 0],
            ['Documents', client.documents?.length || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-[#003A8C]">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {featureStatus.map(([label, ready]) => (
              <span key={label} className={`rounded-full px-3 py-1 text-xs font-bold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {ready ? 'Ready' : 'Roadmap'}: {label}
              </span>
            ))}
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-bold ${activeTab === tab ? 'border-b-2 border-[#D4AF37] text-[#003A8C]' : 'text-slate-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Drafts' && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            {canEdit && (
              <form onSubmit={createDraft} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-950">Create Client Draft</h2>
                <input value={forms.draftTitle} onChange={(e) => updateForm('draftTitle', e.target.value)} placeholder="Draft title" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                <textarea value={forms.draftContent} onChange={(e) => updateForm('draftContent', e.target.value)} placeholder="Paste the client story, proposal section, or draft." rows={8} className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button disabled={saving} className="w-full rounded-lg bg-[#003A8C] px-4 py-3 text-sm font-bold text-white">Create Draft</button>
              </form>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">Draft Library</h2>
                <div className="flex gap-2">
                  <button disabled={!selectedDrafts.length || saving} onClick={runBulkCheckmate} className="rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#0A0F1A] disabled:opacity-50">Run Bulk Checkmate</button>
                  {bulkReports.length > 0 && <button onClick={exportBulkCsv} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Export CSV</button>}
                </div>
              </div>
              <div className="space-y-3">
                {(client.drafts || []).map((draft) => (
                  <div key={draft.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <label className="flex items-start gap-3">
                        <input type="checkbox" checked={selectedDrafts.includes(draft.id)} onChange={(e) => {
                          setSelectedDrafts((current) => e.target.checked ? [...current, draft.id] : current.filter((item) => item !== draft.id));
                        }} className="mt-1" />
                        <span>
                          <span className="block font-bold text-[#003A8C]">{draft.title}</span>
                          <span className="text-xs text-slate-500">Updated {new Date(draft.updatedAt).toLocaleDateString()}</span>
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <Link to={`/workspace/${draft.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 no-underline">Open</Link>
                        <button onClick={() => exportDraft(draft, 'pdf')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">PDF</button>
                        <button onClick={() => exportDraft(draft, 'docx')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">DOCX</button>
                        <button onClick={() => runReport(draft.id)} className="rounded-lg bg-[#003A8C] px-3 py-2 text-xs font-bold text-white">Score</button>
                      </div>
                    </div>
                  </div>
                ))}
                {client.drafts?.length === 0 && <p className="text-sm text-slate-500">No drafts in this client folder yet.</p>}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Templates' && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            {canEdit && (
              <form onSubmit={createTemplate} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-950">Client Template</h2>
                <select value={forms.templateType} onChange={(e) => updateForm('templateType', e.target.value)} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {TEMPLATE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={forms.templateTitle} onChange={(e) => updateForm('templateTitle', e.target.value)} placeholder="Template title" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                <textarea value={forms.templateContent} onChange={(e) => updateForm('templateContent', e.target.value)} rows={8} placeholder="Reusable client content Steve can pull into drafts." className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                <button disabled={saving} className="w-full rounded-lg bg-[#003A8C] px-4 py-3 text-sm font-bold text-white">Save Template</button>
              </form>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">Template Library</h2>
              <div className="space-y-3">
                {(client.templates || []).map((template) => (
                  <article key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{template.type.replaceAll('_', ' ')}</p>
                    <h3 className="mt-1 font-bold text-[#003A8C]">{template.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{template.content}</p>
                  </article>
                ))}
                {client.templates?.length === 0 && <p className="text-sm text-slate-500">No client-specific templates yet.</p>}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Reports' && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Checkmate Reports</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-3">Draft</th><th className="py-3">Score</th><th className="py-3">Issues found</th><th className="py-3">Fix button</th><th className="py-3">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {(client.reports || []).map((report) => (
                    <tr key={report.id} className="border-b border-slate-100">
                      <td className="py-3 font-bold text-[#003A8C]">{report.draft?.title || report.title}</td>
                      <td className="py-3"><span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">{report.score}/100</span></td>
                      <td className="py-3 text-slate-600">{[...(report.missingComponents || []), ...(report.complianceIssues || [])].slice(0, 3).join('; ') || 'No critical issues flagged'}</td>
                      <td className="py-3"><button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Ask Steve to fix</button></td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => exportReport(report, 'pdf')} className="rounded-lg bg-[#003A8C] px-3 py-2 text-xs font-bold text-white">PDF</button>
                          <button onClick={() => exportReport(report, 'docx')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">DOCX</button>
                          <button onClick={() => exportReport(report, 'html')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">HTML</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {client.reports?.length === 0 && <p className="mt-4 text-sm text-slate-500">No reports yet. Score a draft or run bulk Checkmate.</p>}
          </section>
        )}

        {activeTab === 'Documents' && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            {canEdit && (
              <form onSubmit={createDocument} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-950">Add Document Record</h2>
                <input value={forms.documentName} onChange={(e) => updateForm('documentName', e.target.value)} placeholder="Document name" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                <input value={forms.documentType} onChange={(e) => updateForm('documentType', e.target.value)} placeholder="Type, e.g. 501(c)(3), Budget, Audit" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={forms.documentUrl} onChange={(e) => updateForm('documentUrl', e.target.value)} placeholder="Secure document URL" className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button disabled={saving} className="w-full rounded-lg bg-[#003A8C] px-4 py-3 text-sm font-bold text-white">Add Document</button>
              </form>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">Uploaded Documents</h2>
              <div className="space-y-3">
                {(client.documents || []).map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-bold text-[#003A8C]">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.type || 'Document'} {doc.url ? ` / ${doc.url}` : ''}</p>
                  </div>
                ))}
                {client.documents?.length === 0 && <p className="text-sm text-slate-500">No document records yet.</p>}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Permissions' && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Folder-Level Permissions</h2>
            {role === 'owner' && (
              <form onSubmit={addPermission} className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_140px]">
                <input value={forms.permissionEmail} onChange={(e) => updateForm('permissionEmail', e.target.value)} placeholder="teammate@example.com" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                <select value={forms.permissionRole} onChange={(e) => updateForm('permissionRole', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="viewer">Viewer</option><option value="editor">Editor</option>
                </select>
                <button disabled={saving} className="rounded-lg bg-[#003A8C] px-4 py-2 text-sm font-bold text-white">Grant Access</button>
              </form>
            )}
            <div className="space-y-3">
              {(client.permissions || []).map((permission) => (
                <div key={permission.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <span className="font-bold text-[#003A8C]">{permission.email || permission.userId}</span>
                  <span className="ml-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{permission.role}</span>
                </div>
              ))}
              {client.permissions?.length === 0 && <p className="text-sm text-slate-500">No extra folder permissions yet.</p>}
            </div>
          </section>
        )}

        {activeTab === 'Activity' && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Team Activity Log</h2>
            <div className="space-y-3">
              {(client.activityLogs || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-[#003A8C]">{item.action}</p>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {client.activityLogs?.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
