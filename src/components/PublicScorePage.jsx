/**
 * Public Checkmate checkup — the anonymous funnel page.
 * ----------------------------------------------------------------------------
 * The public surface for POST /api/public/score. Upload a draft, get the same
 * Checkmate rubric the paid product uses: a score, the six criteria, and the
 * named gaps. No account, no credit card.
 *
 * Three rules this page exists to honour:
 *
 * 1. The diagnosis is free and the fixes are paid. The server withholds the
 *    fixes (see applyScoreGate), so there is nothing here to blur — the locked
 *    panel states what unlocking gives and never renders text the API did not
 *    send. Faking a blurred "fix" would be inventing advice.
 *
 * 2. Never claim the document was kept. It is read in memory and discarded
 *    server-side; the page says so before the upload, not after.
 *
 * 3. A score must be shown with its reasons. A number with no criteria and no
 *    gaps is a horoscope. The breakdown is the product.
 *
 * Upload-only by design: this is how grant consultants actually work, and it
 * removes the "paste your whole proposal" step that loses people at the door.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../lib/apiUrl';
import { savePublicScoreHandoff } from '../lib/publicScoreHandoff';

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');
const MAX_BYTES = 10 * 1024 * 1024;

/** express-rate-limit replies in plain text, so never assume JSON. */
async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function bandColor(score) {
  if (score >= 85) return 'var(--tgm-success)';
  if (score >= 70) return 'var(--tgm-blue)';
  if (score >= 55) return 'var(--tgm-warning)';
  return 'var(--tgm-error)';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── the score dial ───────────────────────────────────────────────────────── */

function ScoreDial({ score, label }) {
  const size = 176;
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = bandColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Checkmate score ${score} out of 100, ${label}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--tgm-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, color: 'var(--tgm-text)' }}>
          {score}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tgm-muted)', letterSpacing: '.08em' }}>
          OUT OF 100
        </span>
        <span
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 700,
            color,
            padding: '3px 12px',
            borderRadius: 999,
            background: 'var(--tgm-bg)',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/* ── one criterion bar ────────────────────────────────────────────────────── */

function CriterionBar({ label, value }) {
  const color = bandColor(value);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tgm-text)' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
      </div>
      <div
        style={{ height: 8, borderRadius: 999, background: 'var(--tgm-border)', overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ── the page ─────────────────────────────────────────────────────────────── */

export default function PublicScorePage() {
  const [status, setStatus] = useState('idle'); // idle | scoring | result | error
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockedOut, setLockedOut] = useState(false);
  const inputRef = useRef(null);

  const pickFile = useCallback((candidate) => {
    setErrorMessage('');
    if (!candidate) return;
    const ext = `.${(candidate.name.split('.').pop() || '').toLowerCase()}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`We can't read ${ext} files. Upload a PDF, Word document, or plain text file.`);
      setFile(null);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setErrorMessage(`That file is ${formatBytes(candidate.size)}. The limit is 10MB — try exporting just the narrative.`);
      setFile(null);
      return;
    }
    setFile(candidate);
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragging(false);
      pickFile(event.dataTransfer?.files?.[0]);
    },
    [pickFile],
  );

  const score = useCallback(async () => {
    if (!file) return;
    setStatus('scoring');
    setErrorMessage('');
    setLockedOut(false);

    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(apiUrl('/api/public/score'), { method: 'POST', body });
      const data = await safeJson(res);

      if (res.status === 429) {
        setLockedOut(true);
        setErrorMessage(
          data.message || 'You have used your free Checkmate scores. Create an account to keep scoring.',
        );
        setStatus('error');
        return;
      }
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Scoring failed. Please try again.');
        setStatus('error');
        return;
      }

      setReport(data);
      setStatus('result');
    } catch (error) {
      setErrorMessage(
        error?.message === 'Failed to fetch'
          ? 'We could not reach the scorer. Check your connection and try again.'
          : error?.message || 'Scoring failed. Please try again.',
      );
      setStatus('error');
    }
  }, [file]);

  const reset = useCallback(() => {
    setStatus('idle');
    setReport(null);
    setFile(null);
    setErrorMessage('');
    setLockedOut(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const criteriaDefs = report?.criteriaDefs?.length
    ? report.criteriaDefs
    : Object.keys(report?.criteria || {}).map((key) => ({ key, label: key }));
  const gaps = report?.missingComponents || [];
  const strengths = report?.strengths || [];
  // Server-set: the evidence floor capped this score. Shown so a well-formatted
  // document that scores low explains itself instead of reading as a broken tool.
  const floorApplied = report?.evidenceFloorApplied === true;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tgm-bg)' }}>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
          padding: '40px 24px 96px',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 44 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'var(--tgm-navy)',
                }}
              >
                GM
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>GrantsMaster</span>
            </Link>
            <Link
              to="/pricing"
              style={{ color: 'rgba(255,255,255,.85)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              Pricing
            </Link>
          </div>

          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.1em',
              color: 'var(--tgm-gold-light)',
              marginBottom: 14,
            }}
          >
            FREE CHECKMATE CHECKUP
          </p>
          <h1 style={{ fontSize: 'clamp(30px, 4.4vw, 46px)', lineHeight: 1.12, fontWeight: 800, margin: '0 0 18px', letterSpacing: '-1px' }}>
            Score your grant proposal before a funder does
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,.86)', maxWidth: 640, margin: 0 }}>
            Checkmate is the scoring engine inside The Grants Master, and it is free to try. Upload a
            draft and get a score out of 100, the six criteria behind it, and the specific gaps that
            cost you points. No account, no credit card.
          </p>
        </div>
      </div>

      {/* ── card ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 940, margin: '-64px auto 0', padding: '0 24px 72px' }}>
        <div
          style={{
            background: 'var(--tgm-surface)',
            border: '1px solid var(--tgm-border)',
            borderRadius: 'var(--tgm-radius-lg)',
            boxShadow: 'var(--tgm-shadow-md)',
            padding: '32px',
          }}
        >
          {/* upload state */}
          {(status === 'idle' || status === 'scoring' || (status === 'error' && !report)) && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Choose a proposal file to score"
                style={{
                  border: `2px dashed ${dragging ? 'var(--tgm-blue)' : 'var(--tgm-border)'}`,
                  background: dragging ? 'rgba(0,58,140,.04)' : 'var(--tgm-bg)',
                  borderRadius: 'var(--tgm-radius-md)',
                  padding: '44px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    margin: '0 auto 16px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                  aria-hidden="true"
                >
                  📄
                </div>
                {file ? (
                  <>
                    <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--tgm-text)', margin: '0 0 4px' }}>
                      {file.name}
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--tgm-muted)', margin: 0 }}>
                      {formatBytes(file.size)} · click to choose a different file
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--tgm-text)', margin: '0 0 6px' }}>
                      Drop your proposal here, or click to choose
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--tgm-muted)', margin: 0 }}>
                      PDF, Word, or plain text · up to 10MB
                    </p>
                  </>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => pickFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />

              {errorMessage && (
                <div
                  role="alert"
                  style={{
                    marginTop: 18,
                    padding: '13px 16px',
                    borderRadius: 'var(--tgm-radius-sm)',
                    background: 'rgba(239,68,68,.07)',
                    border: '1px solid rgba(239,68,68,.28)',
                    color: 'var(--tgm-error)',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {errorMessage}
                  {lockedOut && (
                    <div style={{ marginTop: 12 }}>
                      <Link
                        to="/signup?from=public-score"
                        style={{
                          display: 'inline-block',
                          padding: '10px 18px',
                          borderRadius: 'var(--tgm-radius-sm)',
                          background: 'var(--tgm-blue)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                          textDecoration: 'none',
                        }}
                      >
                        Create a free account
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={score}
                disabled={!file || status === 'scoring'}
                style={{
                  marginTop: 22,
                  width: '100%',
                  padding: '15px 24px',
                  border: 'none',
                  borderRadius: 'var(--tgm-radius-md)',
                  background: !file || status === 'scoring' ? 'var(--tgm-muted)' : 'var(--tgm-blue)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: !file || status === 'scoring' ? 'not-allowed' : 'pointer',
                  transition: 'opacity .15s',
                }}
              >
                {status === 'scoring' ? 'Scoring your proposal…' : 'Score my proposal free'}
              </button>

              <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6, color: 'var(--tgm-muted)', textAlign: 'center' }}>
                Your document is read in memory to produce the score and then discarded. It is never
                stored, and we never share it. Three free scores, no account required.
              </p>
            </>
          )}

          {/* result state */}
          {status === 'result' && report && (
            <div aria-live="polite">
              <div
                style={{
                  display: 'flex',
                  gap: 32,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  paddingBottom: 28,
                  borderBottom: '1px solid var(--tgm-border)',
                }}
              >
                <ScoreDial score={report.score} label={report.label} />
                <div style={{ flex: '1 1 300px', minWidth: 260 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: 'var(--tgm-muted)', margin: '0 0 8px' }}>
                    CHECKMATE RESULT
                  </p>
                  <p style={{ fontSize: 15, color: 'var(--tgm-text)', margin: '0 0 14px', lineHeight: 1.6 }}>
                    {report.fileName ? <strong>{report.fileName}</strong> : 'Your draft'}
                    {report.words ? ` · ${report.words.toLocaleString()} words` : ''}
                    {report.style ? ` · read as a ${report.style}` : ''}
                  </p>
                  {strengths.length > 0 && (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {strengths.map((item) => (
                        <li
                          key={item}
                          style={{ display: 'flex', gap: 9, fontSize: 14, color: 'var(--tgm-text)', marginBottom: 6, lineHeight: 1.5 }}
                        >
                          <span style={{ color: 'var(--tgm-success)', fontWeight: 800 }} aria-hidden="true">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* evidence floor — a tidy document with nothing verifiable is capped */}
              {floorApplied && (
                <div
                  role="note"
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    marginTop: 26,
                    padding: '15px 17px',
                    background: 'rgba(245, 158, 11, 0.10)',
                    border: '1px solid rgba(245, 158, 11, 0.38)',
                    borderRadius: 'var(--tgm-radius-sm)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: '0 0 auto',
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: '50%',
                      background: 'var(--tgm-warning)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: '20px',
                      textAlign: 'center',
                    }}
                  >
                    !
                  </span>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.62, color: 'var(--tgm-text)' }}>
                    <strong>Your score is capped.</strong> This draft reads as well formatted, but
                    Checkmate could not find anything a reviewer can verify — a result, partner,
                    pilot, audit or report. Evidence carries the most weight in the rubric, so a tidy
                    document with no track record cannot reach the top bands until that changes. The
                    evidence line below is the one to fix first.
                  </p>
                </div>
              )}

              {/* criteria */}
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--tgm-text)', margin: '28px 0 18px' }}>
                How you scored on each criterion
              </h2>
              <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {criteriaDefs.map((def) => (
                  <CriterionBar key={def.key} label={def.label} value={report.criteria?.[def.key] ?? 0} />
                ))}
              </div>

              {/* gaps */}
              {gaps.length > 0 && (
                <>
                  <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--tgm-text)', margin: '32px 0 14px' }}>
                    What is costing you points
                  </h2>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {gaps.map((item) => (
                      <li
                        key={item}
                        style={{
                          display: 'flex',
                          gap: 10,
                          fontSize: 15,
                          color: 'var(--tgm-text)',
                          lineHeight: 1.6,
                          padding: '11px 14px',
                          background: 'var(--tgm-bg)',
                          borderRadius: 'var(--tgm-radius-sm)',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ color: 'var(--tgm-warning)', fontWeight: 800 }} aria-hidden="true">
                          !
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* locked fixes */}
              <div
                style={{
                  marginTop: 32,
                  padding: '26px 24px',
                  borderRadius: 'var(--tgm-radius-md)',
                  background: 'linear-gradient(135deg, var(--tgm-navy) 0%, var(--tgm-blue) 100%)',
                  color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }} aria-hidden="true">
                    🔒
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>
                    {gaps.length > 0
                      ? `Steve can fix ${gaps.length === 1 ? 'this' : `all ${gaps.length}`} — unlocked on Starter`
                      : 'The rewrite is unlocked on Starter'}
                  </span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,.86)', margin: '0 0 20px' }}>
                  {report.fixesLocked
                    ? 'You have the diagnosis. The recommended fixes are held back on the free checkup — Starter unlocks the line-by-line rewrite, not just the list of problems.'
                    : 'The recommended fixes are shown above.'}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link
                    to="/signup?from=public-score"
                    // The unlock click is the conversion event. Hand the result
                    // over before we leave, or signup opens as a blank form and
                    // the score that brought them here is gone.
                    onClick={() => savePublicScoreHandoff(report)}
                    style={{
                      display: 'inline-block',
                      padding: '13px 24px',
                      borderRadius: 'var(--tgm-radius-sm)',
                      background: 'linear-gradient(135deg, var(--tgm-gold), var(--tgm-gold-light))',
                      color: 'var(--tgm-navy)',
                      fontWeight: 800,
                      fontSize: 15,
                      textDecoration: 'none',
                    }}
                  >
                    Unlock the fixes — free account
                  </Link>
                  <Link
                    to="/pricing"
                    style={{
                      display: 'inline-block',
                      padding: '13px 24px',
                      borderRadius: 'var(--tgm-radius-sm)',
                      border: '1px solid rgba(255,255,255,.4)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 15,
                      textDecoration: 'none',
                    }}
                  >
                    See what Starter includes
                  </Link>
                </div>
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tgm-blue)',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Score another proposal
                </button>
              </div>

              <p style={{ marginTop: 14, fontSize: 13, color: 'var(--tgm-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                This is an automated first-pass review, not a funder's decision. Always read the
                funder's own guidelines before submitting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
