import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from './UserContext';
import { hasFeature } from '../config/tiers';

const EMPTY_FORM = {
  name: '',
  sector: '',
  state: '',
  funders: '',
  notes: '',
  brandLogoUrl: '',
  brandColor: '#003A8C',
  contactInfo: '',
};

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

export default function ClientsPage() {
  const { user } = useUser() || {};
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const unlocked = hasFeature(user?.tier || 'free', 'client_folders');

  const loadClients = () => {
    setLoading(true);
    fetch('/api/clients', { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || data.error || 'Could not load clients');
        setClients(data.clients || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (unlocked) loadClients();
    else setLoading(false);
  }, [unlocked]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const createClient = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error || 'Could not create client');
      setForm(EMPTY_FORM);
      loadClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">Agency feature</p>
          <h1 className="text-3xl font-bold text-[#003A8C]">Client workspaces are available on Agency plans.</h1>
          <p className="mt-3 text-slate-600">Upgrade to manage multi-client folders, white-label reports, templates, permissions, and bulk Checkmate scoring.</p>
          <Link to="/pricing" className="mt-6 inline-flex rounded-lg bg-[#D4AF37] px-5 py-3 font-bold text-[#0A0F1A] no-underline">View Agency Plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">Consultant Mode</p>
            <h1 className="text-3xl font-bold text-[#003A8C]">Client Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Persistent client folders with drafts, templates, Checkmate reports, uploaded document records, permissions, and activity history.
            </p>
          </div>
          <Link to="/dashboard" className="text-sm font-bold text-[#003A8C] no-underline">Back to dashboard</Link>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={createClient} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Create Client Folder</h2>
            {[
              ['name', 'Client name'],
              ['sector', 'Sector'],
              ['state', 'State'],
              ['funders', 'Target funders, comma separated'],
              ['brandLogoUrl', 'Consultant logo URL'],
              ['brandColor', 'Brand color'],
              ['contactInfo', 'Consultant contact info'],
            ].map(([key, label]) => (
              <label key={key} className="mb-3 block text-sm font-semibold text-slate-700">
                {label}
                <input
                  type={key === 'brandColor' ? 'color' : 'text'}
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required={key === 'name'}
                />
              </label>
            ))}
            <label className="mb-4 block text-sm font-semibold text-slate-700">
              Notes
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button disabled={saving} className="w-full rounded-lg bg-[#003A8C] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </form>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Active Clients</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{clients.length} folders</span>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading clients...</p>
            ) : clients.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No client folders yet. Create one to unlock drafts, templates, reports, permissions, and activity tracking.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {clients.map((client) => (
                  <Link key={client.id} to={`/clients/${client.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 no-underline transition hover:border-[#D4AF37] hover:bg-white">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[#003A8C]">{client.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{[client.sector, client.state].filter(Boolean).join(' / ') || 'Metadata not set'}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{client._count?.drafts || 0} drafts</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600">
                      <span className="rounded bg-white px-2 py-2">{client._count?.templates || 0} templates</span>
                      <span className="rounded bg-white px-2 py-2">{client._count?.reports || 0} reports</span>
                      <span className="rounded bg-white px-2 py-2">{client._count?.documents || 0} docs</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
