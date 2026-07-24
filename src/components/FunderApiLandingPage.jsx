import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────
   Brand tokens (match TGM palette)
───────────────────────────────────────────── */
const NAVY    = '#0A0F1A';
const BLUE    = '#003A8C';
const GOLD    = '#D4AF37';
const GOLD_LT = '#E8D28C';
const LIGHT   = '#F7F9FB';
const SLATE   = '#64748B';

/* ─────────────────────────────────────────────
   API demo steps animation
───────────────────────────────────────────── */
const DEMO_STEPS = [
  {
    icon: '📥',
    label: 'Application arrives',
    code: 'POST /application/score',
    desc: 'Funder portal sends an application payload — text, budget, attachments metadata.',
    output: null,
  },
  {
    icon: '⚖️',
    label: 'Rubric engine fires',
    code: 'Rubric → 3 criteria, weighted',
    desc: 'TGM applies your weighted rubric — Impact Potential 45%, Execution 35%, Budget 20%.',
    output: null,
  },
  {
    icon: '🎯',
    label: 'Score returned',
    code: '{ overall_score: 84, confidence: 79 }',
    desc: 'Per-criterion scores, confidence, risk flags, and a suggested next step — in milliseconds.',
    output: 'overall_score: 84 / 100',
  },
  {
    icon: '🔍',
    label: 'Funder-fit check',
    code: 'POST /application/funder-fit',
    desc: 'Geography, org type, and priority alignment checked in parallel.',
    output: 'recommended_band: fast-track',
  },
  {
    icon: '📊',
    label: 'Cohort intelligence',
    code: 'POST /batch/score',
    desc: 'Score your entire cycle — get a shortlist, risk clusters, and alignment heatmap.',
    output: 'shortlist: top 20% identified',
  },
  {
    icon: '🚀',
    label: 'Decision delivered',
    code: 'Webhook fires to your portal',
    desc: 'Suggested status maps to your workflow stage. Reviewers see TGM signals alongside their own.',
    output: 'move_to_committee_review',
  },
];

function ApiDemoAnimation() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setStep((s) => (s + 1) % DEMO_STEPS.length), 2600);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const current = DEMO_STEPS[step];

  return (
    <div style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, ${BLUE} 100%)`,
      borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,.12)',
      boxShadow: '0 24px 60px rgba(0,0,0,.4)',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {DEMO_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setStep(i); setRunning(false); }}
            style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i === step ? GOLD : 'rgba(255,255,255,.2)',
              transition: 'all .35s ease', border: 'none', cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ minHeight: 160 }}>
        <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8 }}>
          Step {step + 1} of {DEMO_STEPS.length}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 36 }}>{current.icon}</span>
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>{current.label}</h3>
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 13, color: GOLD_LT,
          background: 'rgba(0,0,0,.35)', borderRadius: 8, padding: '8px 14px',
          marginBottom: 14, letterSpacing: '.3px',
        }}>
          {current.code}
        </div>
        <p style={{ color: 'rgba(255,255,255,.78)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
          {current.desc}
        </p>
        {current.output && (
          <div style={{
            marginTop: 14, background: 'rgba(212,175,55,.12)', border: '1px solid rgba(212,175,55,.35)',
            borderRadius: 8, padding: '8px 14px', fontFamily: 'monospace', fontSize: 13, color: GOLD,
          }}>
            ✓ {current.output}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={() => { setStep((s) => (s - 1 + DEMO_STEPS.length) % DEMO_STEPS.length); setRunning(false); }}
          style={{ padding: '7px 18px', borderRadius: 7, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', fontSize: 12 }}
        >← Prev</button>
        <button
          onClick={() => { setStep((s) => (s + 1) % DEMO_STEPS.length); setRunning(false); }}
          style={{ padding: '7px 18px', borderRadius: 7, background: GOLD, border: 'none', color: NAVY, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >Next →</button>
        <button
          onClick={() => setRunning((r) => !r)}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 11 }}
        >
          {running ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Request API Key form
───────────────────────────────────────────── */
function RequestKeyForm() {
  const [form, setForm] = useState({ name: '', org: '', email: '', role: '', message: '' });
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.org.trim()) {
      setErrorMsg('Name, organization, and email are required.');
      setState('error');
      return;
    }
    setState('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/funder-api/request-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'funder-api-landing' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState('success');
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please email us directly.');
        setState('error');
      }
    } catch (_err) {
      setErrorMsg('Network error. Please try again or email us directly.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 32px',
        background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`,
        borderRadius: 16, border: '1px solid rgba(255,255,255,.1)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          Request received.
        </h3>
        <p style={{ color: GOLD_LT, fontSize: 15, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
          We'll review your application and send your API key within 24 hours.
          Pilot funders are onboarded in one session — usually under 30 minutes.
        </p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1px solid #CBD5E1', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5 };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
        </div>
        <div>
          <label style={labelStyle}>Organization *</label>
          <input style={inputStyle} name="org" value={form.org} onChange={handleChange} placeholder="Impact First Foundation" required />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={labelStyle}>Work Email *</label>
          <input style={inputStyle} type="email" name="email" value={form.email} onChange={handleChange} placeholder="jane@foundation.org" required />
        </div>
        <div>
          <label style={labelStyle}>Your Role</label>
          <input style={inputStyle} name="role" value={form.role} onChange={handleChange} placeholder="Program Officer, CTO, etc." />
        </div>
      </div>
      <div>
        <label style={labelStyle}>How will you use the API? (optional)</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="e.g. Pre-screening applicants, portfolio analytics, automating our review cycle..."
        />
      </div>
      {state === 'error' && (
        <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={state === 'submitting'}
        style={{
          padding: '13px 28px', borderRadius: 9, background: state === 'submitting' ? '#94A3B8' : GOLD,
          border: 'none', color: NAVY, fontWeight: 800, fontSize: 15, cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
          letterSpacing: '.2px', transition: 'all .2s',
        }}
      >
        {state === 'submitting' ? 'Sending...' : 'Request API Key →'}
      </button>
      <p style={{ fontSize: 12, color: SLATE, margin: 0, textAlign: 'center' }}>
        No commitment. Pilot cycles are free. We respond within 24 hours.
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function FunderApiLandingPage() {
  const navigate = useNavigate();

  const trustStats = [
    ['500+', 'Organizations on TGM'],
    ['$2.4M+', 'In grants drafted'],
    ['98%', 'Scoring accuracy target'],
    ['< 500ms', 'Avg API response time'],
  ];

  const capabilities = [
    {
      icon: '⚖️',
      title: 'Rubric-based scoring',
      body: 'Your criteria. Your weights. TGM applies them deterministically — per criterion, per application, at scale.',
    },
    {
      icon: '🎯',
      title: 'Funder-fit intelligence',
      body: 'Hard eligibility checks (geography, org type) plus priority alignment scoring. Every application gets a band: reject, review, or fast-track.',
    },
    {
      icon: '📊',
      title: 'Cohort & cycle analytics',
      body: 'Score a full cycle in one call. Get a shortlist, alignment heatmap, risk clusters, and bias detection signals — before reviewers open a single file.',
    },
    {
      icon: '🔗',
      title: 'Workflow hooks',
      body: 'Map TGM\'s suggested statuses to your portal\'s own stages. Fluxx, Foundant, Submittable, custom — we augment what you already run.',
    },
    {
      icon: '🛡️',
      title: 'Deterministic guardrails',
      body: 'AI scores are anchored by hard logic — eligibility rules never bend, budget sanity is always checked, rubric weights are applied numerically.',
    },
    {
      icon: '🔑',
      title: 'API key auth + audit logs',
      body: 'Per-funder API keys. Every call is logged. You always know who scored what, and when.',
    },
  ];

  const integrationPatterns = [
    {
      label: 'Scoring plug-in',
      title: 'Add TGM scores to your reviewer workflow',
      body: 'Your reviewer portal calls /application/score and /application/funder-fit. Scores appear alongside human scores. Over time, auto-route based on TGM output.',
      icon: '🔌',
    },
    {
      label: 'Pre-screening filter',
      title: 'Stop junk proposals before they reach reviewers',
      body: 'Before an application hits your queue, your system calls TGM. Low-fit, low-score apps get auto-reject or "needs revision" — without a human spending 30 minutes on them.',
      icon: '🧹',
    },
    {
      label: 'Portfolio intelligence overlay',
      title: 'See your whole cycle at a glance',
      body: 'At cycle end, send all applications to /batch/score + /cycle/intelligence. Get a decision analytics layer that shows where you\'re over/under-funding and who the real contenders are.',
      icon: '🗂️',
    },
  ];

  const pricingTiers = [
    {
      name: 'Pilot',
      price: 'Free',
      sub: '1-2 grant cycles',
      highlight: false,
      tag: null,
      features: [
        'Up to 150 applications/cycle',
        'Scoring + funder-fit endpoints',
        '1 rubric definition',
        'Batch scoring',
        'Cycle intelligence',
        'Webhook config',
        'Email support',
      ],
      cta: 'Request Pilot Access',
      ctaAction: '#request-key',
    },
    {
      name: 'Scale',
      price: '$499',
      sub: 'per grant cycle',
      highlight: true,
      tag: 'Most popular',
      features: [
        'Up to 1,000 applications/cycle',
        'All Pilot features',
        'Multiple rubric definitions',
        'Priority support',
        'Usage analytics dashboard',
        'Dedicated onboarding session',
        'White-label report exports',
      ],
      cta: 'Request API Key',
      ctaAction: '#request-key',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      sub: 'volume + SLA pricing',
      highlight: false,
      tag: null,
      features: [
        'Unlimited applications',
        'All Scale features',
        'Custom rubric engineering',
        'SLA-backed uptime',
        'SSO + org-level key management',
        'Dedicated account manager',
        'Custom data retention policy',
      ],
      cta: 'Talk to Us',
      ctaAction: '#request-key',
    },
  ];

  const faqs = [
    {
      q: 'Does TGM replace our existing grant portal?',
      a: 'No. TGM is the intelligence layer behind your portal — not a replacement. You keep Fluxx, Foundant, Submittable, or your custom system. TGM augments them with scoring and fit intelligence via API.',
    },
    {
      q: 'What happens to our data?',
      a: 'Application data is used only to return scores and fit analysis for that request. TGM does not train on your funder data or share it across clients. API-level data is isolated per funder.',
    },
    {
      q: 'How fast is the API?',
      a: 'Scoring a single application targets sub-500ms. Batch scoring of 100 applications typically completes in under 5 seconds. Cycle intelligence on a full cohort runs in seconds.',
    },
    {
      q: 'Can we customize the rubric?',
      a: 'Yes — rubric definition is entirely yours. You set criteria names, weights, descriptions, and scoring scale. TGM applies your rubric; you own the intelligence layer.',
    },
    {
      q: 'What does the pilot look like?',
      a: 'One or two real grant cycles — you keep your existing portal. We run scoring, fit, and cycle intelligence as an overlay. You keep all the output. We document the results for your team.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }} className="px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p style={{ color: GOLD, fontWeight: 700, fontSize: 11, letterSpacing: '.9px', textTransform: 'uppercase', marginBottom: 14 }}>
              TGM Funder Intelligence API — v1
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
              The scoring brain behind your grant portal.
            </h1>
            <p style={{ color: GOLD_LT, fontSize: 17, lineHeight: 1.75, marginBottom: 28 }}>
              Stop reviewing junk proposals. Stop running cycles blind.
              TGM gives you automated scoring, funder-fit intelligence, and portfolio analytics — via API, inside the systems you already use.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <a
                href="#request-key"
                style={{
                  padding: '13px 28px', borderRadius: 9, background: GOLD,
                  color: NAVY, fontWeight: 800, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(212,175,55,.35)',
                }}
              >
                Request API Key →
              </a>
              <a
                href="#how-it-works"
                style={{
                  padding: '13px 24px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,.28)', color: '#fff',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                }}
              >
                See How It Works
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>
              Pilot cycles are free. No commitment. Onboarding takes 30 minutes.
            </p>
          </div>
          <ApiDemoAnimation />
        </div>
      </section>

      {/* ── TRUST STATS ── */}
      <section style={{ background: NAVY, borderBottom: '1px solid rgba(255,255,255,.06)' }} className="px-6 py-10">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustStats.map(([stat, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ color: GOLD, fontSize: 28, fontWeight: 900, margin: 0 }}>{stat}</p>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, margin: '4px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE PROP FOR FUNDERS ── */}
      <section style={{ background: LIGHT }} className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p style={{ color: '#B8960C', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Built for funders, not applicants
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1A] mb-4">
              Funders don't care about writing grants. They care about decisions.
            </h2>
            <p style={{ color: SLATE, fontSize: 16, lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
              TGM was built to help nonprofits write better proposals.
              The Funder Intelligence API turns that same engine around —
              so you get better applicants, faster cycles, and smarter decisions.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🏆', title: 'Better applicants', body: 'Nonprofits using TGM submit stronger, more aligned proposals. Your average quality goes up before the cycle opens.' },
              { icon: '⚡', title: 'Faster review cycles', body: 'Pre-screened applicants, ranked cohorts, and auto-suggested statuses. Your reviewers touch fewer files — but make better decisions.' },
              { icon: '💰', title: 'More impact per dollar', body: 'Portfolio intelligence shows you where you\'re over/under-funding, who the outliers are, and what the alignment heatmap looks like before you commit.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#fff', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <h3 style={{ color: NAVY, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
                <p style={{ color: SLATE, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p style={{ color: '#B8960C', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              What the API does
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1A]">
              Six endpoints. Complete intelligence.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map(({ icon, title, body }) => (
              <div key={title} style={{ borderRadius: 12, padding: '22px 24px', border: '1px solid #E2E8F0', background: '#fff' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ color: NAVY, fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
                <p style={{ color: SLATE, fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATION PATTERNS ── */}
      <section style={{ background: NAVY }} className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              How funders plug in
            </p>
            <h2 style={{ color: '#fff' }} className="text-3xl md:text-4xl font-bold">
              Three integration patterns. Zero rip-and-replace.
            </h2>
            <p style={{ color: 'rgba(255,255,255,.6)', marginTop: 14, fontSize: 15, maxWidth: 560, margin: '14px auto 0' }}>
              You're not replacing Fluxx, Foundant, or Submittable. You're adding intelligence on top.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {integrationPatterns.map(({ icon, label, title, body }, i) => (
              <div key={label} style={{
                borderRadius: 14, padding: 28,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 12,
                  background: `rgba(212,175,55,.15)`, marginBottom: 16, fontSize: 22,
                }}>
                  {icon}
                </div>
                <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Pattern {i + 1} — {label}
                </p>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: LIGHT }} className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p style={{ color: '#B8960C', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1A] mb-4">
              Start free. Scale when you win.
            </h2>
            <p style={{ color: SLATE, fontSize: 15, maxWidth: 500, margin: '0 auto' }}>
              Pilot cycles cost you nothing. We want to prove the value before you spend a dollar.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {pricingTiers.map(({ name, price, sub, highlight, tag, features, cta, ctaAction }) => (
              <div
                key={name}
                style={{
                  borderRadius: 16, padding: 32, position: 'relative',
                  background: highlight ? `linear-gradient(160deg, ${NAVY}, ${BLUE})` : '#fff',
                  border: highlight ? 'none' : '1px solid #E2E8F0',
                  boxShadow: highlight ? '0 20px 60px rgba(0,58,140,.3)' : '0 2px 12px rgba(0,0,0,.05)',
                  transform: highlight ? 'scale(1.04)' : 'none',
                }}
              >
                {tag && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: GOLD, color: NAVY, fontSize: 11, fontWeight: 800,
                    padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                  }}>
                    {tag}
                  </div>
                )}
                <h3 style={{ color: highlight ? '#fff' : NAVY, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{name}</h3>
                <p style={{ color: highlight ? GOLD : BLUE, fontSize: 34, fontWeight: 900, margin: '8px 0 2px' }}>{price}</p>
                <p style={{ color: highlight ? 'rgba(255,255,255,.55)' : SLATE, fontSize: 13, marginBottom: 24 }}>{sub}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, color: highlight ? 'rgba(255,255,255,.85)' : '#374151' }}>
                      <span style={{ color: GOLD, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={ctaAction}
                  style={{
                    display: 'block', textAlign: 'center', padding: '12px 20px', borderRadius: 9,
                    background: highlight ? GOLD : BLUE,
                    color: highlight ? NAVY : '#fff',
                    fontWeight: 800, fontSize: 14, textDecoration: 'none',
                  }}
                >
                  {cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILOT INVITATION ── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p style={{ color: '#B8960C', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>
            Pilot program — 3 slots open
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1A] mb-6">
            Be one of the first three funders to run on TGM.
          </h2>
          <p style={{ color: SLATE, fontSize: 16, lineHeight: 1.8, maxWidth: 620, margin: '0 auto 32px' }}>
            Pilot funders get free cycles, direct access to the team, and co-authorship
            on case studies that will define TGM as the infrastructure behind the funding industry.
            This is the Stripe moment — the moment you're on the inside before everyone else arrives.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <a
              href="#request-key"
              style={{
                padding: '14px 32px', borderRadius: 10, background: GOLD,
                color: NAVY, fontWeight: 800, fontSize: 16, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(212,175,55,.35)',
              }}
            >
              Apply for Pilot Access →
            </a>
            <a
              href="https://github.com/Papsybeatz/tgm-backup-2026-03/blob/main/docs/funder-intelligence-api.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '14px 28px', borderRadius: 10,
                border: `2px solid ${BLUE}`, color: BLUE,
                fontWeight: 700, fontSize: 16, textDecoration: 'none',
              }}
            >
              Read the Docs
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: LIGHT }} className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Common questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {faqs.map(({ q, a }) => (
              <div key={q} style={{ background: '#fff', borderRadius: 12, padding: '22px 26px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ color: NAVY, fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{q}</h3>
                <p style={{ color: SLATE, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REQUEST API KEY FORM ── */}
      <section id="request-key" className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <p style={{ color: '#B8960C', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Get started
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A0F1A] mb-4">
              Request your API key.
            </h2>
            <p style={{ color: SLATE, fontSize: 15, lineHeight: 1.7 }}>
              Tell us about your foundation and your current review process.
              We'll send your key and schedule a 30-minute onboarding session.
            </p>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: 36, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}>
            <RequestKeyForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY}, ${BLUE})` }} className="px-6 py-16 text-center">
        <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', marginBottom: 14 }}>
          The Grants Master — Funder Intelligence API
        </p>
        <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          The infrastructure funders rely on.
        </h2>
        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 15, marginBottom: 28, maxWidth: 500, margin: '12px auto 28px' }}>
          Once funders adopt your scoring engine, nonprofits and consultants must use TGM to stay aligned.
          That's network lock-in. That's OS-level positioning.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="#request-key"
            style={{
              padding: '13px 30px', borderRadius: 9, background: GOLD,
              color: NAVY, fontWeight: 800, fontSize: 15, textDecoration: 'none',
            }}
          >
            Request API Key →
          </a>
          <Link
            to="/"
            style={{
              padding: '13px 26px', borderRadius: 9,
              border: '1px solid rgba(255,255,255,.28)', color: '#fff',
              fontWeight: 700, fontSize: 15, textDecoration: 'none',
            }}
          >
            Back to TGM →
          </Link>
        </div>
        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, marginTop: 28 }}>
          © {new Date().getFullYear()} The Grants Master. All rights reserved.
        </p>
      </section>
    </div>
  );
}
