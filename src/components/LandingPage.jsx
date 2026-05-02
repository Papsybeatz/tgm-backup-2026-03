import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

/* ── Demo Modal ── */
// Replace LOOM_URL with your Loom embed URL when ready
const LOOM_URL = '';

const DEMO_STEPS = [
  { icon: '🏆', label: 'Intro',           desc: 'AI-powered grant writing for nonprofits, founders & agencies.' },
  { icon: '📊', label: 'Dashboard',       desc: 'Clean UI, tier-aware modules, multi-workspace hub.' },
  { icon: '✍️', label: 'New Draft',       desc: 'Click New Draft, describe your mission.' },
  { icon: '✦',  label: 'AI Generate',     desc: 'One click — full funder-ready proposal generated.' },
  { icon: '⚡', label: 'Upgrade Flow',    desc: 'Unlock advanced features via LemonSqueezy checkout.' },
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Re-render when language changes
  const lang = i18n.language;

  const features = [
    { title: t('ai_drafting', 'AI-Powered Drafting'), desc: 'Generate funder-ready grant proposals in minutes, not weeks.' },
    { title: t('compliance', 'Compliance Validation'), desc: 'Automatically check your draft against funder requirements.' },
    { title: t('collaboration', 'Team Collaboration'), desc: 'Invite your team, assign sections, and review together.' },
    { title: t('refinement', 'Matching Engine'), desc: 'Find the right grants for your mission from thousands of sources.' },
    { title: t('export', 'Scoring Engine'), desc: 'Get an AI score on your draft before you submit.' },
    { title: t('features', 'Analytics Dashboard'), desc: 'Track submissions, win rates, and funding pipeline.' },
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

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0A0F1A]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center shadow-md">
              <span className="text-[#0A0F1A] font-bold text-sm">GM</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GrantsMaster</span>
          </div>
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <a href="#features" className="hover:text-[#D4AF37] transition">Features</a>
            <a href="#testimonials" className="hover:text-[#D4AF37] transition">Testimonials</a>
            <Link to="/contact" className="hover:text-[#D4AF37] transition">Contact</Link>
          </div>
          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            <Link to="/login" className="px-4 py-2 text-sm text-white hover:text-[#D4AF37] transition">{t('login', 'Login')}</Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0F1A] text-sm font-bold shadow hover:shadow-lg transition">
              {t('get_started', 'Get Started Free')}
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0F1A] border-t border-white/10 px-6 py-4 flex flex-col gap-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-[#D4AF37] text-sm">Features</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-[#D4AF37] text-sm">Testimonials</a>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-[#D4AF37] text-sm">Contact</Link>
            <div className="flex gap-3 pt-2 border-t border-white/10">
              <Link to="/login" className="flex-1 text-center px-4 py-2 text-sm text-white border border-white/20 rounded-lg">Login</Link>
              <Link to="/signup" className="flex-1 text-center px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0F1A] text-sm font-bold">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] text-white py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#E8D28C] font-semibold mb-3 flex items-center gap-2">
              <span>🏆</span> Award-Winning Grant Writing Platform
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {t('hero_title', 'The fastest, smartest way to draft and win more grants.')}
            </h1>
            <p className="text-lg text-[#E8D28C] mb-8">
              {t('hero_subtitle', 'AI-powered grant writing built for nonprofits, agencies, and consultants.')}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-3 rounded-lg bg-[#D4AF37] text-[#0A0F1A] font-semibold shadow-md hover:shadow-xl transition"
              >
                {t('get_started', 'Get Started Free')}
              </button>
              <button
                onClick={() => setShowDemo(true)}
                className="px-6 py-3 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition flex items-center gap-2"
              >
                <span style={{ fontSize: 18 }}>▶</span> Watch Demo
              </button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/30 text-white hover:bg-white/20 transition">
                Watch Demo
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-400">{t('no_credit_card', 'No credit card required')} · {t('cancel_anytime', 'Cancel anytime')}</p>
          </div>

          {/* AI Preview Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <p className="text-[#E8D28C] font-semibold mb-3 text-sm">✦ AI Draft Preview</p>
            <div className="bg-white text-gray-800 p-5 rounded-lg shadow-md mb-4">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Grant: Community Health Initiative</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "Our organization seeks funding to expand access to preventive healthcare services in underserved communities. Through evidence-based interventions and community partnerships…"
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-xs text-gray-300">AI is generating your draft…</span>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="py-16 bg-[#F7F9FB] border-t-4 border-[#D4AF37]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center px-6">
          {[
            { title: 'AI-Powered Drafting', icon: '✍️' },
            { title: 'Compliance Validation', icon: '✅' },
            { title: 'Team Collaboration', icon: '👥' },
          ].map(({ title, icon }) => (
            <div key={title} className="p-6 bg-white rounded-xl shadow-sm border-t-4 border-[#D4AF37]">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-lg font-semibold text-[#003A8C] mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">Built to help you move from idea to funder-ready proposal.</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE GRID */}
      <section id="features" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] font-semibold mb-2">Everything you need</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Built for grant winners</h2>
            <p className="text-gray-600 mt-2 max-w-xl mx-auto">Every tool you need to research, draft, validate, and win grants — in one platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#D4AF37]/40 transition">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] mb-4" />
                <h3 className="font-semibold text-[#003A8C] mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI ENGINE SECTION */}
      <section className="py-20 bg-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2">Trusted by award committees and funding reviewers nationwide</p>
        <h2 className="text-3xl font-bold text-[#D4AF37] mb-4">Powered by the GrantsMaster AI Engine</h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-10">
          Generate tailored drafts, refine clarity, and align with funder requirements — all in one intelligent workflow.
        </p>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 text-left">
          {[
            { stat: '10x', label: 'Faster than manual drafting' },
            { stat: '94%', label: 'Funder alignment score' },
            { stat: '$2M+', label: 'Grants won by our users' },
          ].map(({ stat, label }) => (
            <div key={stat} className="bg-white/10 rounded-xl p-6 border border-white/10">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">{stat}</p>
              <p className="text-gray-300 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO SECTION */}
      <section className="py-20 bg-[#0A0F1A] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-3">See It In Action</p>
          <h2 className="text-3xl font-bold text-white mb-4">From idea to funder-ready proposal in 2 minutes</h2>
          <p className="text-gray-400 mb-10 text-lg">Watch how GrantsMaster generates a complete, professional grant letter from a single sentence.</p>

          {/* Demo preview card */}
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
              {/* Fake browser chrome */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {['#EF4444','#F59E0B','#22C55E'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              {/* Fake editor lines */}
              {['## Grant Proposal — U-Smile Foundation','','**Executive Summary**',
                'U-Smile Foundation respectfully submits this proposal…','',
                '**Statement of Need**','Rural orphanages lack access to…'].map((line, i) => (
                <div key={i} style={{
                  height: line === '' ? 8 : 12, marginBottom: 8,
                  background: line.startsWith('##') ? 'rgba(212,175,55,.6)'
                    : line.startsWith('**') ? 'rgba(255,255,255,.5)'
                    : 'rgba(255,255,255,.2)',
                  borderRadius: 4,
                  width: line === '' ? 0 : line.length > 40 ? '90%' : line.length > 20 ? '65%' : '45%',
                }} />
              ))}
            </div>

            {/* Play button overlay */}
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
          <h2 className="text-3xl font-bold text-center text-[#0A0F1A] mb-3">Trusted by Early Grant Writers</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">Real feedback from nonprofits, consultants, and agencies using TGM during beta.</p>
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
          {t('get_started', 'Get Started Free')}
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
