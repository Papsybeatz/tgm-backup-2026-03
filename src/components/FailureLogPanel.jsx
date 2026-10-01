import React, { useCallback, useEffect, useState } from 'react';

/**
 * Failures — the "show me everything that failed for this account" view.
 *
 * Reads /api/admin/errors, which filters the persisted ErrorLog. Every
 * occurrence is listed here; only the alert EMAIL is throttled, so a failure
 * that alerted once is still visible on every repeat.
 *
 * This is the half of the loop that makes real users usable as testers: a user
 * reports "it didn't work", and this answers which account, which tier, which
 * endpoint, and why — without reproducing anything.
 */

const SEVERITY_STYLE = {
  critical: { background: '#fef2f2', color: '#dc2626' },
  error: { background: '#fef2f2', color: '#b91c1c' },
  warning: { background: '#fffbeb', color: '#d97706' },
  info: { background: '#f0f9ff', color: '#0284c7' },
};

const TIER_OPTIONS = ['', 'free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];
const SEVERITY_OPTIONS = ['', 'critical', 'error', 'warning', 'info'];

const EMPTY = { userEmail: '', tier: '', path: '', severity: '' };

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  color: '#0f172a',
  background: '#fff',
};

const labelStyle = { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' };

export default function FailureLogPanel() {
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [state, setState] = useState({ loading: true, errors: [], total: 0, error: '' });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    const token = localStorage.getItem('token');
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) qs.set(key, value);
    });
    qs.set('limit', '100');

    try {
      const res = await fetch(`/api/admin/errors?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not load failures.');
      setState({ loading: false, errors: body.errors || [], total: body.total || 0, error: '' });
    } catch (e) {
      setState({ loading: false, errors: [], total: 0, error: e.message });
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const submit = (event) => {
    event.preventDefault();
    setFilters(draft);
  };

  const clear = () => {
    setDraft(EMPTY);
    setFilters(EMPTY);
  };

  const isFiltered = Object.values(filters).some(Boolean);

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 8px 22px rgba(15,23,42,0.04)', border: '1px solid #eaf0f6' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#334155' }}>Failures</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Filter by account, tier, endpoint or severity. Every occurrence is recorded; only the alert email is throttled.
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
          {state.loading ? 'Loading…' : `${state.total} match${state.total === 1 ? '' : 'es'}`}
        </div>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={labelStyle} htmlFor="failure-email">Account email</label>
          <input
            id="failure-email"
            style={inputStyle}
            placeholder="user@example.com"
            value={draft.userEmail}
            onChange={(e) => setDraft((d) => ({ ...d, userEmail: e.target.value }))}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="failure-tier">Tier</label>
          <select id="failure-tier" style={inputStyle} value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value }))}>
            {TIER_OPTIONS.map((t) => <option key={t || 'any'} value={t}>{t || 'Any tier'}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="failure-path">Endpoint contains</label>
          <input
            id="failure-path"
            style={inputStyle}
            placeholder="/api/team"
            value={draft.path}
            onChange={(e) => setDraft((d) => ({ ...d, path: e.target.value }))}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="failure-severity">Severity</label>
          <select id="failure-severity" style={inputStyle} value={draft.severity} onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}>
            {SEVERITY_OPTIONS.map((sev) => <option key={sev || 'any'} value={sev}>{sev || 'Any severity'}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button
            type="submit"
            style={{ border: 'none', background: '#003A8C', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Apply
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={clear}
              style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {state.error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>
          {state.error}
        </div>
      )}

      {!state.loading && !state.errors.length && !state.error && (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: '18px 0' }}>
          {isFiltered ? 'Nothing matches those filters.' : 'No failures recorded. That is the state you want.'}
        </div>
      )}

      {state.errors.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {['When', 'Status', 'Endpoint', 'Tier', 'Account', 'Message', 'Request id'].map((heading) => (
                  <th key={heading} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 10, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.errors.map((row) => {
                const sev = SEVERITY_STYLE[row.severity] || SEVERITY_STYLE.info;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ fontSize: 12, color: '#475569', padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px 10px 0' }}>
                      <span style={{ ...sev, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {row.status || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#0f172a', padding: '10px 12px 10px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {row.method ? `${row.method} ` : ''}{row.path || row.endpoint || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#475569', padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>{row.tier || '—'}</td>
                    <td style={{ fontSize: 12, color: '#475569', padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>{row.userEmail || '—'}</td>
                    <td style={{ fontSize: 12, color: '#334155', padding: '10px 12px 10px 0', maxWidth: 320 }}>{row.message}</td>
                    <td style={{ fontSize: 11, color: '#94a3b8', padding: '10px 0', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.requestId || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {state.total > state.errors.length && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
              Showing the most recent {state.errors.length} of {state.total}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
