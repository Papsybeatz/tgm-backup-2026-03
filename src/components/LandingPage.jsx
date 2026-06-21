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

  const outcomeStats = [
    ['3.5 hrs', 'Average proposal time'],
    ['41%', 'Win rate, up from 22%'],
    ['$180k', 'Won in the first 90 days'],
    ['40%', 'Cost reduction for teams'],
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
    'SOC-2 style security practices',
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

  const testimonials = [
    {
      quote: 'GrantsMaster made me aware of documents I didn\'t even know I needed. My proposals are now funder-ready.',
      author: 'Amara J.', role: 'Nonprofit Director', location: 'Atlanta, GA',
      avatar: 'AJ', tier: 'Pro', stars: 5,
    },
    {
      quote: 'We won our first federal grant in 3 weeks. The AI engine writes better than our consultants — and costs 10x less.',
      author: 'Marcus T.', role: 'Agency Owner', location: 'New York, NY',
      avatar: 'MT', tier: 'Agency', stars: 5,
    },
    {
      quote: 'The Grant Readiness Checklist alone saved us from submitting an incomplete application. Game changer.',
      author: 'Priya S.', role: 'Grant Consultant', location: 'Chicago, IL',
      avatar: 'PS', tier: 'Starter', stars: 5,
    },
    {
      quote: 'I went from blank page to a 12-page proposal in under an hour. The funder loved it.',
      author: 'David O.', role: 'Community Organiser', location: 'Houston, TX',
      avatar: 'DO', tier: 'Pro', stars: 5,
    },
    {
      quote: 'Finally a tool built for real grant writers, not just tech people. The UI is clean and the AI actually understands nonprofit language.',
      author: 'Fatima K.', role: 'Programme Director', location: 'London, UK',
      avatar: 'FK', tier: 'Lifetime', stars: 5,
    },
    {
      quote: 'Our team of 6 now manages 20+ client proposals simultaneously. The multi-workspace dashboard is exactly what we needed.',
      author: 'Rachel M.', role: 'Grants Manager', location: 'Toronto, CA',
      avatar: 'RM', tier: 'Agency', stars: 5,
    },
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
              Draft, evaluate, and align funder-ready proposals in hours, not weeks. Built for nonprofits, consultants, and agencies who need more capacity — fast.
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
            <p className="mt-4 text-sm text-gray-400">
              Trusted by 500+ organizations. $2.4M+ in grants drafted.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <p className="text-[#E8D28C] font-semibold mb-3 text-sm">TGM Capacity Preview</p>
            <div className="bg-white text-gray-800 p-5 rounded-lg shadow-md mb-4">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Proposal: Community Health Initiative</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "TGM found three missing proof points, strengthened funder alignment, and prepared a reviewer-ready narrative for submission."
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Draft', 'Ready'],
                ['Checkmate', '94%'],
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

      {/* OUTCOME PROOF */}
      <section className="py-16 bg-[#F7F9FB] border-t-4 border-[#D4AF37] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">Outcome proof</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Grant writers win more with TGM</h2>
            <p className="text-gray-600 mt-3 max-w-3xl mx-auto">
              TGM turns your ideas into funder-aligned proposals with the accuracy, structure, and compliance reviewers expect.
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

      {/* NY PERSONALIZATION */}
      <section className="py-20 bg-[#F7F9FB] px-6">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-[#B8960C] text-xs font-bold uppercase tracking-widest mb-2">New York beachhead</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A] mb-4">New York organizations: get a local advantage</h2>
            <p className="text-gray-600 leading-7 mb-6">
              TGM includes a dedicated NY workspace for grant seekers who need local opportunities, deadlines, rules, and funder intelligence.
            </p>
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
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Why teams choose TGM over generic AI tools</h2>
            <p className="text-gray-600 mt-3">TGM is built specifically for grants — not general writing.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#0A0F1A] text-white">
                <tr>
                  {['Feature', 'TGM', 'ChatGPT', 'Instrumentl'].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([feature, tgm, chatgpt, instrumentl]) => (
                  <tr key={feature} className="border-t border-[#E2E8F0]">
                    <td className="px-5 py-4 font-semibold text-gray-800">{feature}</td>
                    {[tgm, chatgpt, instrumentl].map((enabled, index) => (
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

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-20 bg-[#F8F9FC] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <span className="inline-block bg-[#D4AF37]/15 text-[#B8960C] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">Beta Users</span>
          </div>
          <h2 className="text-3xl font-bold text-center text-[#0A0F1A] mb-3">Trusted by nonprofits, consultants, and agencies</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">500+ beta users. 4.9/5 average rating. 94% would recommend TGM.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, author, role, location, avatar, tier, stars }) => (
              <div key={author} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-gray-700 text-sm leading-relaxed flex-1">"{quote}"</p>
                {/* Author row */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-[#003A8C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A0F1A] truncate">{author}</p>
                    <p className="text-xs text-gray-500 truncate">{role} · {location}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-[#003A8C]/10 text-[#003A8C] px-2 py-0.5 rounded-full flex-shrink-0">{tier}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Trust bar */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
            {[['500+', 'Beta Users'], ['$2.4M+', 'Grants Drafted'], ['4.9/5', 'Avg Rating'], ['94%', 'Would Recommend']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-[#003A8C]">{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2">Join thousands using the award-winning GrantsMaster platform</p>
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
            <Link to="/lead-magnet/grant-workflow-blueprint" className="hover:text-[#D4AF37] transition">Free Blueprint</Link>
            <Link to="/contact" className="hover:text-[#D4AF37] transition">Contact</Link>
            <Link to="/privacy" className="hover:text-[#D4AF37] transition">Privacy</Link>
            <Link to="/terms"   className="hover:text-[#D4AF37] transition">Terms</Link>
            <Link to="/login"   className="hover:text-[#D4AF37] transition">Login</Link>
            <Link to="/signup"  className="hover:text-[#D4AF37] transition">Sign Up</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} GrantsMaster. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
