import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
    { quote: '"We won our first grant in 3 weeks using TGM."', author: 'Nonprofit Director, Atlanta' },
    { quote: '"The AI engine writes better than our consultants."', author: 'Agency Owner, New York' },
    { quote: '"The best grant writing tool on the market."', author: 'Grant Consultant, Chicago' },
  ];

  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0A0F1A]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center shadow-md">
              <span className="text-[#0A0F1A] font-bold text-sm">GM</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GrantsMaster</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <a href="#features" className="hover:text-[#D4AF37] transition">Features</a>
            <a href="#testimonials" className="hover:text-[#D4AF37] transition">Testimonials</a>
            <Link to="/contact" className="hover:text-[#D4AF37] transition">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link to="/login" className="px-4 py-2 text-sm text-white hover:text-[#D4AF37] transition">{t('login', 'Login')}</Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0F1A] text-sm font-bold shadow hover:shadow-lg transition">
              {t('get_started', 'Get Started Free')}
            </Link>
          </div>
        </div>
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

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-[#003A8C]">What Users Say</h2>
          <p className="text-gray-600 mt-2">Real stories from organizations winning more grants with TGM.</p>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {testimonials.map(({ quote, author }) => (
            <div key={author} className="bg-white p-6 rounded-xl shadow-md border border-[#D4AF37]/40">
              <p className="text-gray-700 italic mb-4">{quote}</p>
              <p className="text-sm font-semibold text-[#003A8C]">— {author}</p>
            </div>
          ))}
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
            <Link to="/login" className="hover:text-[#D4AF37] transition">Login</Link>
            <Link to="/signup" className="hover:text-[#D4AF37] transition">Sign Up</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} GrantsMaster. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
