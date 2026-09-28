import React, { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Reviewer Mode — the decision surface over a funder's scored cohort.
 *
 * The engines live in the funder intelligence API. This page never scores
 * anything itself; it posts a cohort to /api/funder/reviewer/worklist (a
 * server-side proxy, because the funder's org API key must not reach a browser)
 * and lays out what comes back:
 *
 *   ranked cohorts · suggested statuses · risk flags · bias signals
 *
 * The bias panel is deliberately the most prominent thing here. A ranking a
 * reviewer cannot interrogate is a ranking they will not trust, and bias is the
 * question funders are actually accountable for.
 */

const NAVY = '#0A0F1A';
const GOLD = '#D4AF37';
const BLUE = '#003A8C';

const STATUS_STYLE = {
  advance: { bg: '#ECFDF5', fg: '#047857', label: 'Advance' },
  hold: { bg: '#FFFBEB', fg: '#B45309', label: 'Hold' },
  needs_more_info: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'Needs more info' },
  decline: { bg: '#FEF2F2', fg: '#B91C1C', label: 'Decline' },
};

const SEVERITY_STYLE = {
  high: { border: '#FCA5A5', bg: '#FEF2F2', fg: '#991B1B' },
  medium: { border: '#FCD34D', bg: '#FFFBEB', fg: '#92400E' },
  low: { border: '#CBD5E1', bg: '#F8FAFC', fg: '#475569' },
};

/** A plausible cohort so the page is usable before any real data is wired in. */
function sampleCohort() {
  const geopgraphies = ['ke', 'ng', 'gh'];
  return Array.from({ length: 12 }, (_, i) => {
    const words = 40 + i * 35;
    const text = Array.from({ length: words }, (_, w) => `word${w}`).join(' ');
    return {
      id: `sample_${i + 1}`,
      narratives: { need: text, approach: text },
      budget: { total: 25000 + i * 5000, lines: [{ label: 'programme', amount: 25000 }] },
      org_profile: { country: geopgraphies[i % geopgraphies.length], registration_number: `REG-${i}` },
      metadata: { geography: geopgraphies[i % geopgraphies.length] },
    };
  });
}

async function postJson(path, body) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error([data?.message, data?.detail].filter(Boolean).join(' — ') || `Request failed (${res.status})`);
  }
  return data;
}

function Chip({ children, bg, fg }) {
  return (
    <span style={{ background: bg, color: fg, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
      {children}
    </span>
  );
}

function ScoreBar({ value }) {
  const colour = value >= 75 ? '#059669' : value >= 55 ? GOLD : '#F59E0B';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <span style={{ flex: 1, height: 6, background: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: colour }} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', width: 26, textAlign: 'right' }}>{value}</span>
    </span>
  );
}

function ApplicantRow({ row }) {
  const status = STATUS_STYLE[row.suggested_status] || STATUS_STYLE.hold;
  const highRisk = (row.risk_flags || []).filter((f) => f.severity === 'high');

  return (
    <tr>
      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#64748B' }}>{row.rank}</td>
      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.application_id}</td>
      <td style={{ padding: '10px 12px' }}><ScoreBar value={row.composite_score} /></td>
      <td style={{ padding: '10px 12px', color: '#475569', fontSize: 12 }}>{row.geography || '—'}</td>
      <td style={{ padding: '10px 12px' }}>
        <Chip bg={status.bg} fg={status.fg}>{status.label}</Chip>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#475569', maxWidth: 320 }}>
        {row.rationale}
        {highRisk.length > 0 && (
          <div style={{ marginTop: 4, color: '#991B1B', fontWeight: 700 }}>
            ⚠ {highRisk.map((f) => f.flag).join(', ')}
          </div>
        )}
      </td>
    </tr>
  );
}

function CohortTable({ title, rows, tone }) {
  if (!rows?.length) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 8px' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: tone }}>{title}</span>
        <span style={{ fontSize: 12, color: '#64748B' }}>{rows.length} applicant{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#', 'Applicant', 'Composite', 'Region', 'Suggested', 'Why'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <ApplicantRow key={row.application_id} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FunderReviewerPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/funder/reviewer/status', {
      headers: { Authorization: `Bearer ${window.localStorage.getItem('token') || ''}` },
    })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const runReview = useCallback(async (applications) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await postJson('/api/funder/reviewer/worklist', { applications });
      setResult(data);
    } catch (e) {
      setError(e.message || 'Review failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRun = useCallback(() => {
    let applications;
    try {
      applications = input.trim() ? JSON.parse(input) : sampleCohort();
    } catch {
      setError('That is not valid JSON. Paste an array of applications, or clear the box to use the sample cohort.');
      return;
    }
    if (!Array.isArray(applications)) applications = applications.applications;
    if (!Array.isArray(applications) || !applications.length) {
      setError('Expected an array of applications.');
      return;
    }
    void runReview(applications);
  }, [input, runReview]);

  const summary = result?.summary;
  const bias = result?.bias_signals || [];
  const highBias = useMemo(() => bias.filter((s) => s.severity === 'high'), [bias]);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', color: NAVY }}>
      <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, padding: '40px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px', color: GOLD, fontSize: 12, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Funder Intelligence
          </p>
          <h1 style={{ margin: '0 0 10px', color: '#fff', fontSize: 34, fontWeight: 900 }}>Reviewer mode</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,.78)', fontSize: 15, maxWidth: 720, lineHeight: 1.7 }}>
            Ranked cohorts, suggested statuses, risk flags and bias signals — so your team reads less and decides more.
            Reviewer seats are included in your funder plan.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
        {status && !status.configured && (
          <div style={{ marginBottom: 20, border: '1px solid #FCD34D', background: '#FFFBEB', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#92400E' }}>
            <strong>Reviewer mode is not configured yet.</strong>{' '}
            {!status.hasSidecarUrl && 'FUNDER_INTELLIGENCE_BASE_URL is missing. '}
            {!status.hasKey && 'FUNDER_INTELLIGENCE_REVIEWER_KEY is missing. '}
            Set them on the backend service, then reload.
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900 }}>Your cohort</h2>
              <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>
                Paste an array of applications, or leave empty to run the sample cohort.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setInput(JSON.stringify(sampleCohort(), null, 2))}
                style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#334155', cursor: 'pointer' }}
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={loading}
                style={{ border: 'none', background: GOLD, borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 900, color: NAVY, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1 }}
              >
                {loading ? 'Reviewing…' : 'Run review'}
              </button>
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='[ { "id": "app_1", "narratives": { "need": "…" }, "budget": { "total": 50000 } } ]'
            style={{ marginTop: 14, width: '100%', minHeight: 120, border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, fontSize: 12.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', outline: 'none', resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 20, border: '1px solid #FCA5A5', background: '#FEF2F2', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#991B1B' }}>
            {error}
          </div>
        )}

        {result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                ['Applicants', summary?.applicants ?? 0],
                ['Advance', summary?.advance_candidates ?? 0],
                ['High risk', summary?.high_risk ?? 0],
                ['Reviewer seats', summary?.reviewer_seats === null ? '∞' : summary?.reviewer_seats ?? '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B' }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>

            {bias.length > 0 && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Bias signals</h2>
                  {highBias.length > 0 && <Chip bg="#FEF2F2" fg="#991B1B">{highBias.length} high severity</Chip>}
                </div>
                {bias.map((signal, i) => {
                  const tone = SEVERITY_STYLE[signal.severity] || SEVERITY_STYLE.low;
                  return (
                    <div key={`${signal.type}-${i}`} style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong style={{ color: tone.fg, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {String(signal.type).replace(/_/g, ' ')}
                        </strong>
                        <Chip bg="#fff" fg={tone.fg}>{signal.severity}</Chip>
                      </div>
                      <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: NAVY }}>{signal.finding}</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{signal.why_it_matters}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <CohortTable title="Top cohort" rows={result.cohorts?.top} tone="#047857" />
            <CohortTable title="Middle cohort" rows={result.cohorts?.middle} tone="#B45309" />
            <CohortTable title="Lower cohort" rows={result.cohorts?.lower} tone="#B91C1C" />

            {result.score_distribution && (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B', marginBottom: 8 }}>
                  Score distribution
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, fontWeight: 700 }}>
                  {Object.entries(result.score_distribution).map(([band, count]) => (
                    <span key={band}>{band}: <span style={{ color: BLUE }}>{count}</span></span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
