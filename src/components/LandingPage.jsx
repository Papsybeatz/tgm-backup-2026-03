import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';


/* ── Demo Modal ── */
// Replace LOOM_URL with your Loom embed URL when ready
const LOOM_URL = 'https://www.youtube.com/embed/46kzSuXaB-4?autoplay=1&rel=0';

const DEMO_STEPS = [
  { icon: '🏆', label: 'Intro',           desc: 'AI-powered grant writing for nonprofits, founders & agencies.' },
  { icon: '📊', label: 'Dashboard',       desc: 'Clean UI, tier-aware modules, multi-workspace hub.' },
  { icon: '✍️', label: 'New Draft',       desc: 'Click New Draft, describe your mission.' },
  { icon: '✦',  label: 'AI Generate',     desc: 'One click — full funder-ready proposal generated.' },
  { icon: '⚡', label: 'Upgrade Flow',    desc: 'Unlock advanced features via secure Stripe checkout.' },
  { icon: '🎯', label: 'Ship It',         desc: 'Professional proposals in minutes, not weeks.' },
];

function DemoModal({ onClose }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % DEMO_STEPS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,15,26,.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720,
        overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.4)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0F1A, #003A8C)',
          padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #D4AF37, #E8D28C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: '#0A0F1A',
            }}>GM</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>GrantsMaster — Platform Demo</span>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Video or animated demo */}
        {LOOM_URL ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe src={LOOM_URL} style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none',
            }} allowFullScreen />
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(160deg, #0A0F1A 0%, #003A8C 100%)',
            padding: '48px 32px', textAlign: 'center', minHeight: 320,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
              {DEMO_STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 28 : 8, height: 8, borderRadius: 4,
                  background: i === step ? '#D4AF37' : 'rgba(255,255,255,.2)',
                  transition: 'all .4s ease',
                }} />
              ))}
            </div>

            <div style={{
              fontSize: 56, marginBottom: 20,
              filter: 'drop-shadow(0 4px 12px rgba(212,175,55,.3))',
            }}>{DEMO_STEPS[step].icon}</div>

            <p style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Step {step + 1} of {DEMO_STEPS.length}
            </p>
            <h3 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>
              {DEMO_STEPS[step].label}
            </h3>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, maxWidth: 400, lineHeight: 1.6, margin: 0 }}>
              {DEMO_STEPS[step].desc}
            </p>

            {/* Manual controls */}
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button onClick={() => setStep(s => (s - 1 + DEMO_STEPS.length) % DEMO_STEPS.length)} style={{
                padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', fontSize: 13,
              }}>← Prev</button>
              <button onClick={() => setStep(s => (s + 1) % DEMO_STEPS.length)} style={{
                padding: '8px 20px', borderRadius: 8, background: '#D4AF37',
                border: 'none', color: '#0A0F1A', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}>Next →</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#F7F9FB',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
            {LOOM_URL ? '2 min demo' : 'Interactive preview — full video coming soon'}
          </p>
          <Link to="/signup" onClick={onClose} style={{
            padding: '9px 22px', borderRadius: 8, background: '#D4AF37',
            color: '#0A0F1A', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>Get Started Free →</Link>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [grantMode, setGrantMode] = useState('ny');

  const outcomeStats = [
    ['Checkmate', 'Pre-submission scoring engine'],
    ['Steve', 'In-app drafting assistant'],
    ['NY Intelligence', 'Our deepest funder module'],
    ['< 24 hrs', 'Support response, Mon–Fri'],
  ];

  const capacityBullets = [
    'Produce more proposals with the same staff',
    'Never miss a deadline again',
    'Standardize quality across your team',
    'Reduce burnout and bottlenecks',
  ];

  const securityBullets = [
    'Your data is never used to train AI models',
    'Encrypted at rest and in transit',
    'Human-in-the-loop workflows',
    'Transparent AI governance for nonprofits',
    'Security practices designed around SOC 2 principles',
  ];

  const alignmentBullets = [
    'Funder alignment',
    'Missing components',
    'Compliance issues',
    'Narrative gaps',
    'Budget inconsistencies',
    'NYSCA / NYSED / ESD / NYC Arts / Robin Hood rules',
  ];

  const nyBullets = [
    'Curated NY grant opportunities',
    'NY deadlines & reminders',
    'NY compliance rules',
    'NY funder intelligence',
    'NY Grant Readiness Checklist',
    'NY Grant Fit Score',
  ];

  const consultantBullets = [
    'Multi-client folders',
    'White-label reports',
    'Bulk Checkmate scoring',
    'Client onboarding templates',
    'Team collaboration',
    'Faster turnaround = higher margins',
  ];

  const comparisonRows = [
    ['Grant drafting', true, true, false],
    ['Funder alignment', true, false, true],
    ['Compliance scoring', true, false, false],
    ['NY personalization', true, false, false],
    ['Grant readiness score', true, false, false],
    ['Consultant mode', true, false, false],
  ];

  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] text-white py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#E8D28C] font-semibold mb-3 flex items-center gap-2">
              Capacity engine for grant teams
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Add a grant writer to your team — without hiring one.
            </h1>
            <p className="text-lg text-[#E8D28C] mb-8">
              TGM gives your team the grant-writing capacity of a full-time staff member — without hiring one. Draft funder-ready proposals and get a compliance score before you submit.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-3 rounded-lg bg-[#D4AF37] text-[#0A0F1A] font-semibold shadow-md hover:shadow-xl transition"
              >
                Start Free — No Credit Card
              </button>
              <button
                onClick={() => setShowDemo(true)}
                className="px-6 py-3 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition flex items-center gap-2"
              >
                <span style={{ fontSize: 18 }}>▶</span> Watch Demo
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-400">Built for nonprofits, consultants, and agencies that need more capacity now.</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <p className="text-[#E8D28C] font-semibold mb-3 text-sm">TGM Capacity Preview</p>
            <div className="bg-white text-gray-800 p-5 rounded-lg shadow-md mb-4">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Proposal: Community Health Initiative</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "TGM found three missing proof points, strengthened funder alignment, and prepared a reviewer-ready narrative for submission."
              </p>
            </div>
            <div className="mb-4 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-[#E8D28C]">Checkmate review</p>
              <p className="mt-1 text-5xl font-black text-[#D4AF37]">92%</p>
              <p className="text-xs text-gray-300">Alignment Score before submission</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Draft', 'Ready'],
                ['Checkmate', '92%'],
                ['Deadline', 'On track'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/10 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-300">{label}</p>
                  <p className="mt-1 text-sm font-bold text-[#D4AF37]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THREE-STEP SOLUTION */}
      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">The TGM workflow</p>
            <h2 className="text-3xl font-black text-[#0A0F1A]">More capacity in three focused steps.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['01', 'Describe your mission', 'Give TGM your organization, program, goals, and target funder context.'],
              ['02', 'Draft with Steve', 'Generate a structured, funder-ready proposal that sounds like your organization.'],
              ['03', 'Score with Checkmate', 'Fix alignment, compliance, narrative, and budget gaps before submission.'],
            ].map(([number, title, body]) => (
              <article key={number} className="border-t-4 border-[#D4AF37] bg-white p-6 shadow-sm">
                <p className="text-3xl font-black text-[#D4AF37]">{number}</p>
                <h3 className="mt-4 text-xl font-bold text-[#0A0F1A]">{title}</h3>
                <p className="mt-3 leading-7 text-gray-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* TRUST RIBBON */}
      <section className="border-b border-[#E2E8F0] bg-white px-6 py-8">
        <div className="mx-auto grid max-w-6xl gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Used by nonprofits', 'NY, TX, CA, VA & Canada'],
            ['Real founder', 'Gee Oh Dee (Tech) LLC'],
            ['Secure by design', 'Stripe + SSL + encryption at rest'],
            ['Free to start', 'No credit card required'],
          ].map(([value, label]) => (
            <div key={value} className="border-l-2 border-[#D4AF37] px-4">
              <p className="text-lg font-black text-[#003A8C]">{value}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OUTCOME PROOF */}
      <section className="py-16 bg-[#F7F9FB] border-t-4 border-[#D4AF37] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">What TGM does</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Capability, not hype</h2>
            <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
              TGM turns your ideas into funder-aligned proposals with the structure and compliance checks reviewers expect. Try it free and judge the output yourself.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {outcomeStats.map(([value, label]) => (
              <div key={label} className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-[#003A8C]">{value}</p>
                <p className="mt-2 text-sm font-semibold text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">The grant-writing gap</p>
          <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-4xl">Generic tools produce generic proposals. Generic proposals get rejected.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['Generic writing tools', 'Can help create a first draft, but usually lack funder-specific compliance and scoring.'],
              ['Grant tracking tools', 'Can help organize opportunities, but do not strengthen the proposal itself.'],
              ['TGM + Checkmate', 'Scores your proposal before a funder ever sees it.'],
            ].map(([title, body], index) => (
              <article key={title} className={`rounded-xl p-6 ${index === 2 ? 'border border-[#D4AF37] bg-[#D4AF37]/10' : 'border border-white/10 bg-white/5'}`}>
                <h3 className="text-xl font-bold text-[#E8D28C]">{title}</h3>
                <p className="mt-3 leading-7 text-gray-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CAPACITY */}
      <section id="features" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">Capacity engine</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A] mb-4">Your team just gained capacity</h2>
            <p className="text-gray-600 leading-7 mb-6">
              Most organizations don’t struggle with writing — they struggle with time. TGM expands your grant-writing capacity instantly.
            </p>
            <button
              onClick={() => setShowDemo(true)}
              className="rounded-lg border border-[#003A8C] px-5 py-3 text-sm font-bold text-[#003A8C] transition hover:bg-[#003A8C] hover:text-white"
            >
              See how it works →
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {capacityBullets.map((item) => (
              <div key={item} className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-5">
                <p className="text-sm font-bold text-[#003A8C]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & SECURITY */}
      <section className="py-20 bg-[#0A0F1A] text-white px-6">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-2">Trust & security</p>
            <h2 className="text-3xl font-bold mb-4">Built for trust, privacy, and compliance</h2>
            <p className="text-gray-300 leading-7 mb-6">
              Grant proposals contain sensitive data. TGM protects it with enterprise-grade security.
            </p>
            <Link
              to="/privacy"
              className="inline-flex rounded-lg border border-white/30 px-5 py-3 text-sm font-bold text-white no-underline transition hover:bg-white/10"
            >
              View Security & Privacy →
            </Link>
          </div>
          <div className="grid gap-3">
            {securityBullets.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 px-5 py-4 text-sm font-semibold text-[#E8D28C]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNDER ALIGNMENT */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 max-w-3xl">
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">Checkmate + Steve</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A] mb-4">Funder-aligned proposals, every time</h2>
            <p className="text-gray-600 leading-7">
              TGM doesn’t just write — it evaluates. Our Checkmate engine analyzes your draft, then Steve, your in-app assistant, helps fix every weakness in one click.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {alignmentBullets.map((item) => (
                <div key={item} className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-5">
                  <p className="text-sm font-bold text-[#003A8C]">{item}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFF9E8] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#92400E] mb-3">Checkmate result</p>
              <h3 className="text-2xl font-bold text-[#0A0F1A] mb-3">Reviewer-ready in fewer passes</h3>
              <p className="text-sm leading-6 text-gray-700 mb-5">
                Score alignment, compliance, narrative strength, and budget consistency before a funder ever sees the application.
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white"
              >
                Try Checkmate →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GRANT INTELLIGENCE */}
      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[.85fr_1.15fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Your moat</p>
            <h2 className="mb-4 text-3xl font-black text-[#0A0F1A]">Grant Intelligence Engine</h2>
            <p className="leading-7 text-gray-600">TGM turns scattered funder signals into practical decisions your team can use before the deadline.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Funder alignment rules', 'Past winner analysis', 'Award size benchmarks', 'Compliance checks', 'Success probability indicator', 'NY Intelligence Module: deepest dataset'].map((item) => (
              <div key={item} className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm font-bold text-[#003A8C] shadow-sm">{item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* NY PERSONALIZATION */}
      <section className="py-20 bg-[#F7F9FB] px-6">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">New York beachhead</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A] mb-4">NY Intelligence is our deepest module. TGM works for all U.S. and international grants.</h2>
            <p className="text-gray-600 leading-7 mb-6">
              Start with the local intelligence nonprofits need, then use the same workspace for federal, foundation, and international opportunities.
            </p>
            <div className="mb-6 inline-flex rounded-lg border border-[#E2E8F0] bg-white p-1" role="group" aria-label="Grant intelligence mode">
              {['ny', 'global'].map((mode) => (
                <button key={mode} type="button" onClick={() => setGrantMode(mode)} className={`rounded-md px-4 py-2 text-sm font-bold ${grantMode === mode ? 'bg-[#003A8C] text-white' : 'text-[#003A8C]'}`}>
                  {mode === 'ny' ? 'NY Mode' : 'Global Mode'}
                </button>
              ))}
            </div>
            <p className="mb-6 text-sm font-semibold text-[#003A8C]">{grantMode === 'ny' ? 'NYSCA, NYSED, ESD, NYC Arts, and local funder rules.' : 'U.S. Federal, foundation, and international grant workflows.'}</p>
            <Link
              to="/new-york-grants"
              className="inline-flex rounded-lg border border-[#003A8C] px-5 py-3 text-sm font-bold text-[#003A8C] no-underline transition hover:bg-[#003A8C] hover:text-white"
            >
              Explore NY Grants →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {nyBullets.map((item) => (
              <div key={item} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-[#003A8C]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULTANT MODE */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B8960C] mb-3">Consultant mode</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A] mb-4">For consultants & agencies</h2>
            <p className="text-gray-600 leading-7 mb-6">
              Scale your client workload without sacrificing quality.
            </p>
            <Link
              to="/pricing"
              className="inline-flex rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#0A0F1A] no-underline"
            >
              See Consultant Mode →
            </Link>
          </div>
          <div className="grid gap-3">
            {consultantBullets.map((item) => (
              <div key={item} className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 bg-[#F7F9FB] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">Built for grants</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">One workflow for grant capacity and intelligence</h2>
            <p className="text-gray-600 mt-3">TGM combines drafting, funder intelligence, compliance checks, and pre-submission scoring in one workspace.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#0A0F1A] text-white">
                <tr>
                  {['Feature', 'TGM', 'Generic writing tools', 'Grant tracking tools'].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([feature, tgm, genericWriting, grantTracking]) => (
                  <tr key={feature} className="border-t border-[#E2E8F0]">
                    <td className="px-5 py-4 font-semibold text-gray-800">{feature}</td>
                    {[tgm, genericWriting, grantTracking].map((enabled, index) => (
                      <td key={`${feature}-${index}`} className="px-5 py-4">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${enabled ? 'bg-[#D4AF37] text-[#0A0F1A]' : 'bg-gray-100 text-gray-400'}`}>
                          {enabled ? '✓' : '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* DEMO SECTION */}
      <section className="py-20 bg-[#0A0F1A] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-3">See It In Action</p>
          <h2 className="text-3xl font-bold text-white mb-4">From idea to funder-ready proposal in 2 minutes</h2>
          <p className="text-gray-400 mb-10 text-lg">Watch how GrantsMaster adds drafting, evaluation, and alignment capacity to your team.</p>

          <div
            onClick={() => setShowDemo(true)}
            className="relative cursor-pointer group mx-auto"
            style={{ maxWidth: 680 }}
          >
            <div style={{
              background: 'linear-gradient(160deg, #003A8C, #0A0F1A)',
              borderRadius: 16, padding: '60px 32px',
              border: '1px solid rgba(212,175,55,.3)',
              boxShadow: '0 24px 64px rgba(0,0,0,.5)',
            }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {['#EF4444','#F59E0B','#22C55E'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              {['## Checkmate Review','','Funder alignment: strong','Missing component: evaluation plan','Budget narrative: needs clarification','','Steve suggested 5 fixes'].map((line, i) => (
                <div key={i} style={{
                  height: line === '' ? 8 : 12, marginBottom: 8,
                  background: line.startsWith('##') ? 'rgba(212,175,55,.6)'
                    : line.includes(':') ? 'rgba(255,255,255,.5)'
                    : 'rgba(255,255,255,.2)',
                  borderRadius: 4,
                  width: line === '' ? 0 : line.length > 36 ? '86%' : line.length > 20 ? '64%' : '42%',
                }} />
              ))}
            </div>

            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16,
              background: 'rgba(10,15,26,.4)',
              transition: 'background .2s',
            }} className="group-hover:bg-[rgba(10,15,26,0.2)]">
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#D4AF37',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: '#0A0F1A',
                boxShadow: '0 8px 32px rgba(212,175,55,.5)',
                transform: 'scale(1)', transition: 'transform .2s',
              }} className="group-hover:scale-110">▶</div>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-6">2-minute walkthrough · No signup required to watch</p>
        </div>
      </section>

      {/* HONEST PROOF */}
      <section id="testimonials" className="py-20 bg-[#F8F9FC] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <span className="inline-block bg-[#D4AF37]/15 text-[#B8960C] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">Honest by default</span>
          </div>
          <h2 className="text-3xl font-bold text-center text-[#0A0F1A] mb-3">We&apos;re early. We&apos;d rather earn proof than fake it.</h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">We don&apos;t publish placeholder quotes or invented reviews. Here is what we can show you today.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ["Real users, real places", "Nonprofits and agencies in New York, Texas, California, Virginia, and Canada use TGM today."],
              ["A named founder and a real company", "Gee Oh Dee (Tech) LLC — reachable by phone and email. No anonymous AI wrapper."],
              ["A product you can judge yourself", "Run your own draft through Checkmate, free, with no credit card. Test the output, not the marketing."],
            ].map(([title, body]) => (
              <div key={title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#0A0F1A] mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0A0F1A]">Run your own draft free →</button>
            <a href="mailto:support@thegrantsmaster.com?subject=My%20TGM%20story" className="rounded-lg border border-[#003A8C] px-6 py-3 text-sm font-bold text-[#003A8C] no-underline">Using TGM? Tell us your story →</a>
          </div>
        </div>
      </section>

      {/* TRUST & TRANSPARENCY */}
      <section id="trust" className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Trust &amp; Transparency</p>
          <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-4xl">Built by real people. Secured like it matters.</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Nonprofits handle sensitive budgets, board strategy, and compliance data. We treat that trust as the foundation — not a marketing line.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              ["A real founder and a real company", "The Grants Master is built and run by Thomas Clottey, founder of Gee Oh Dee (Tech) LLC in Roanoke, Virginia. Named, reachable, and accountable."],
              ["Used across the U.S. and Canada", "Nonprofits and agencies in New York, Texas, California, Virginia, and Canada use TGM today. We'd rather show real adoption than inflate numbers."],
              ["Enterprise-grade data practices", "Payments secured by Stripe. SSL-encrypted sessions. Drafts encrypted at rest. GDPR & CCPA aligned. Your data is never used to train AI models."],
              ["Pricing with no surprises", "The Free plan is forever free. No credit card to start. Cancel anytime. Transparent pricing with no hidden fees."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold text-[#E8D28C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{body}</p>
              </div>
            ))}
          </div>
          <Link to="/trust" className="mt-10 inline-flex items-center gap-2 font-semibold text-[#D4AF37] no-underline hover:text-[#E8D28C]">
            Read our full Trust &amp; Transparency commitment →
          </Link>
        </div>
      </section>
      {/* FOUNDER LEGITIMACY */}
      <section className="bg-[#FFF9E8] px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[180px_1fr] md:items-center">
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 border-[#D4AF37] bg-white shadow-sm ring-1 ring-[#D4AF37]/30">
            <img
              src="/founder-headshot.jpg"
              alt="Thomas Clottey"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#92400E]">Founder&apos;s note</p>
            <h2 className="mb-4 text-3xl font-black text-[#0A0F1A]">Our mission is simple: help nonprofits win more grants with less stress.</h2>
            <p className="max-w-3xl text-lg leading-8 text-gray-700">
              As part of my passion to build AI-powered web applications and software that solve real pain points, I built The Grants Master because nonprofits deserve more than generic AI. After years of watching teams spend 40+ hours on a single narrative—and still lose funding due to avoidable alignment issues—I knew there had to be a better way.
            </p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-700">
              TGM gives every organization the grant-writing capacity of a full-time staff member, without the cost. With Steve drafting funder-ready narratives and Checkmate scoring proposals before submission, you finally get clarity, speed, and confidence in one place.
            </p>
            <div className="mt-7 space-y-2 text-[#003A8C]">
              <p className="font-bold">Thomas Clottey</p>
              <p className="font-medium">Full Stack / AI Software Developer</p>
              <p className="font-medium">Founder, The Grants Master</p>
              <p className="mt-4 text-sm font-medium text-gray-800">Legal Entity: Gee Oh Dee (Tech) LLC</p>
              <p className="text-sm text-gray-800">4210 Electric Road #1038</p>
              <p className="text-sm text-gray-800">Roanoke, VA 24018</p>
              <p className="text-sm text-gray-800">United States</p>
              <p className="mt-2 text-sm font-semibold">
                <a className="text-[#003A8C] underline" href="https://www.linkedin.com/in/thomas-clottey" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                {' · '}
                <a className="text-[#003A8C] underline" href="https://www.facebook.com/TheGrantsMaster" target="_blank" rel="noopener noreferrer">Facebook</a>
                {' · '}
                <a className="text-[#003A8C] underline" href="tel:+15405669760">(540) 566-9760</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2">Build the grant-writing capacity your mission needs</p>
        <h2 className="text-4xl font-bold mb-4">Ready to win more grants?</h2>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">Start free today. No credit card required.</p>
        <button
          onClick={() => navigate('/signup')}
          className="px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition"
        >
          Get Started Free
        </button>
      </section>

      {/* FOOTER */}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      <footer className="bg-[#0A0F1A] text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center">
              <span className="text-[#0A0F1A] font-bold text-xs">GM</span>
            </div>
            <span className="text-white font-semibold">GrantsMaster</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/pricing" className="hover:text-[#D4AF37] transition">Pricing</Link>
            <Link to="/new-york-grants" className="hover:text-[#D4AF37] transition">NY Grants</Link>
            <Link to="/consultants" className="hover:text-[#D4AF37] transition">Consultants</Link>
            <Link to="/trust" className="hover:text-[#D4AF37] transition">Trust</Link>
            <Link to="/about" className="hover:text-[#D4AF37] transition">About</Link>
            <Link to="/lead-magnet/grant-workflow-blueprint" className="hover:text-[#D4AF37] transition">Free Blueprint</Link>
            <Link to="/contact" className="hover:text-[#D4AF37] transition">Contact</Link>
            <Link to="/privacy" className="hover:text-[#D4AF37] transition">Privacy</Link>
            <Link to="/terms"   className="hover:text-[#D4AF37] transition">Terms</Link>
            <Link to="/login"   className="hover:text-[#D4AF37] transition">Login</Link>
            <Link to="/signup"  className="hover:text-[#D4AF37] transition">Sign Up</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Gee Oh Dee (Tech) LLC. All rights reserved.</p>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-6 text-center text-xs leading-6">
          <p className="font-bold text-white">The Grants Master is a product of Gee Oh Dee (Tech) LLC.</p>
          <p>4210 Electric Road #1038, Roanoke, VA 24018, United States</p>
          <p>
            <a className="hover:text-[#D4AF37]" href="mailto:support@thegrantsmaster.com">support@thegrantsmaster.com</a>
            {' · '}
            <a className="hover:text-[#D4AF37]" href="tel:+15405669760">(540) 566-9760</a>
            {' · '}
            <a className="hover:text-[#D4AF37]" href="https://www.linkedin.com/in/thomas-clottey" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            {' · '}
            <a className="hover:text-[#D4AF37]" href="https://www.facebook.com/TheGrantsMaster" target="_blank" rel="noopener noreferrer">Facebook</a>
          </p>
          <p className="mt-2">Payments processed by Stripe · SSL-encrypted sessions · Drafts encrypted at rest · Your data is never used to train AI models</p>
        </div>
      </footer>

    </div>
  );
}
