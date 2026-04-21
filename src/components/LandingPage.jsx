import React from "react";
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center shadow-lg">
              <span className="text-[#0A0F1A] font-bold text-lg">GM</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A0F1A]">GrantsMaster</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm text-gray-600 hover:text-[#0A0F1A] font-medium">
              About
            </button>
            <Link to="/login" className="text-sm text-gray-600 hover:text-[#0A0F1A] font-medium">
              Log in
            </Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0F1A] font-semibold text-sm shadow-md hover:shadow-xl transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] text-white pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            {/* Brand */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center shadow-lg">
                <span className="text-[#0A0F1A] font-bold">GM</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">GrantsMaster</h1>
            </div>

            {/* Award Tag */}
            <p className="text-[#E8D28C] font-semibold mb-2">
              🏆 Award‑Winning Grant Writing Platform
            </p>

            {/* Headline */}
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              The fastest, smartest way to draft and win more grants.
            </h2>

            {/* Subheadline */}
            <p className="text-lg text-[#E8D28C] mb-8">
              AI‑powered grant writing built for nonprofits, agencies, and consultants.
            </p>

            {/* CTAs */}
            <div className="flex gap-4 flex-wrap">
              <Link to="/signup" className="px-6 py-3 rounded-lg bg-[#D4AF37] text-[#0A0F1A] font-semibold shadow-md hover:shadow-xl transition">
                Get Started Free
              </Link>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/30 text-white hover:bg-white/20 transition">
                Watch Demo
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 mt-8 text-sm text-gray-300">
              <span className="flex items-center gap-2">✓ No credit card required</span>
              <span className="flex items-center gap-2">✓ Cancel anytime</span>
              <span className="flex items-center gap-2">✓ Free to start</span>
            </div>
          </div>

          {/* Right: AI Preview */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <p className="text-[#E8D28C] font-semibold mb-2">AI Draft Preview</p>
            <div className="bg-white text-gray-800 p-6 rounded-lg shadow-md">
              <p className="italic text-gray-600">
                "Your AI‑generated grant draft will appear here…"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="py-16 bg-[#F7F9FB] border-t-4 border-[#D4AF37]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🏆", title: "AI‑Powered Drafting", desc: "Generate tailored drafts in minutes using your organization's real context." },
            { icon: "✅", title: "Compliance Validation", desc: "Built-in checks to align with funder requirements and reduce rejection risk." },
            { icon: "🤝", title: "Team Collaboration", desc: "Invite teammates, comment on drafts, and keep everything in one workspace." }
          ].map((item) => (
            <div key={item.title} className="p-6 bg-white rounded-xl shadow-sm border-t-4 border-[#D4AF37]">
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <h3 className="text-xl font-semibold text-[#003A8C] mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#0A0F1A] mb-4">
            Built for real‑world grant work
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Everything you need to go from idea to funder‑ready proposal in minutes.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "AI‑Powered Drafting", desc: "Generate tailored grant drafts in minutes, not weeks." },
              { title: "Compliance Validation", desc: "Built‑in checks to align with funder requirements." },
              { title: "Team Collaboration", desc: "Invite teammates and collaborate in real‑time." },
              { title: "Export to PDF/Word", desc: "Download polished proposals ready to submit." },
              { title: "Grant Matching", desc: "Find the perfect funding opportunities for your project." },
              { title: "Analytics Dashboard", desc: "Track your grant pipeline and success rates." }
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <h3 className="text-lg font-semibold text-[#0A0F1A] mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DARK AI ENGINE SECTION */}
      <section className="py-20 bg-[#0A0F1A] text-white text-center">
        <p className="text-[#D4AF37] font-semibold mb-2">
          Trusted by award committees and funding reviewers nationwide
        </p>
        <h2 className="text-3xl font-bold text-[#D4AF37] mb-4">
          Powered by the GrantsMaster AI Engine
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-8">
          Generate tailored drafts, refine clarity, and align with funder requirements using our proprietary AI technology.
        </p>
        <div className="flex justify-center gap-8 text-sm text-gray-400">
          <span>✓ 10,000+ Grants Written</span>
          <span>✓ $500M+ Funding Secured</span>
          <span>✓ 98% Client Satisfaction</span>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-[#003A8C]">What Users Say</h2>
          <p className="text-gray-600 mt-2">
            Real stories from organizations winning more grants with GrantsMaster.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-6">
          {[
            { quote: "We won our first grant in 3 weeks using GrantsMaster. The AI engine is incredible.", author: "Sarah M., Executive Director" },
            { quote: "The AI engine writes better than our consultants. Saved us thousands.", author: "James L., Grant Writer" },
            { quote: "The best grant writing tool on the market. Highly recommended.", author: "Maria K., Nonprofit Founder" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-md border border-[#D4AF37]/40">
              <p className="text-gray-700 italic mb-4">"{item.quote}"</p>
              <p className="text-gray-500 text-sm font-medium">— {item.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center">
        <p className="text-[#D4AF37] font-semibold mb-2">
          Join thousands using the award‑winning GrantsMaster platform
        </p>
        <h2 className="text-4xl font-bold mb-6">Ready to win more grants?</h2>
        <Link to="/signup" className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-semibold shadow-lg hover:shadow-2xl transition">
          Get Started Free
        </Link>
        <p className="mt-4 text-gray-400 text-sm">No credit card required • Start in seconds</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0F1A] text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E8D28C] flex items-center justify-center">
              <span className="text-[#0A0F1A] font-bold text-sm">GM</span>
            </div>
            <span className="text-white font-semibold">GrantsMaster</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
            <button className="hover:text-white transition">Privacy</button>
            <button className="hover:text-white transition">Terms</button>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} GrantsMaster. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
