import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="bg-white text-gray-900">
      {/* NAVBAR */}
      <header className="w-full border-b border-gray-200">
        <nav className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <Link to="/" className="text-2xl font-bold text-blue-600">The Grants Master</Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition">Home</Link>
            <Link to="/pricing" className="text-gray-700 hover:text-blue-600 transition">Pricing</Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition">Contact</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-extrabold mb-4">AI‑powered grant writing for nonprofits & agencies</h1>
        <p className="text-xl text-gray-600 mb-8">Write stronger grants, find better opportunities, and manage clients—all in one intelligent workspace.</p>
        <div className="flex justify-center gap-4 mb-10">
          <Link to="/pricing" className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition">Start Free</Link>
          <a href="#demo" className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg text-lg font-semibold hover:bg-gray-200 transition">Watch Demo</a>
        </div>
        <div className="flex justify-center mb-12">
          <div style={{ width: 720, height: 360, background: '#f4f8ff', borderRadius: 16, boxShadow: '0 2px 16px rgba(47,128,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#2f80ed' }}>
            [Editor + Scoring + Matching Screenshot]
          </div>
        </div>
      </section>

      {/* VALUE PILLARS */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10 text-center">
        <div>
          <div style={{ fontSize: 36 }}>✍️</div>
          <h3 className="font-bold text-lg mb-2">Write winning grants with AI</h3>
          <p className="text-gray-600">A professional writing environment built for clarity, structure, and impact. Rewrite, refine, and strengthen every section with intelligent suggestions.</p>
        </div>
        <div>
          <div style={{ fontSize: 36 }}>📊</div>
          <h3 className="font-bold text-lg mb-2">Score your drafts like a reviewer</h3>
          <p className="text-gray-600">Instant evaluations with strengths, weaknesses, and actionable improvements. Radar charts and funder‑specific scoring help you see exactly where to improve.</p>
        </div>
        <div>
          <div style={{ fontSize: 36 }}>🎯</div>
          <h3 className="font-bold text-lg mb-2">Match with the right grants</h3>
          <p className="text-gray-600">Personalized recommendations based on mission, goals, readiness, and sector. Understand why each grant fits with transparent match reasoning.</p>
        </div>
        <div>
          <div style={{ fontSize: 36 }}>🧩</div>
          <h3 className="font-bold text-lg mb-2">Built for agencies</h3>
          <p className="text-gray-600">Manage multiple clients with dedicated workspaces, onboarding flows, scoring history, and grant tracking. A full CRM‑grade system for grant professionals.</p>
        </div>
      </section>

      {/* FEATURE SHOWCASE */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-10 text-center">
        <div className="card">
          <div style={{ height: 160, background: '#f4f8ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f80ed', fontWeight: 700 }}>[AI Draft Editor Screenshot]</div>
          <h4 className="font-bold mb-2">AI Draft Editor</h4>
          <p className="text-gray-600">Autosave, inline rewrite, tone control, version history.</p>
        </div>
        <div className="card">
          <div style={{ height: 160, background: '#f4f8ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f80ed', fontWeight: 700 }}>[Grant Matching Screenshot]</div>
          <h4 className="font-bold mb-2">Grant Matching</h4>
          <p className="text-gray-600">Match scores, deadlines, filters, save/track grants.</p>
        </div>
        <div className="card">
          <div style={{ height: 160, background: '#f4f8ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f80ed', fontWeight: 700 }}>[Scoring Engine Screenshot]</div>
          <h4 className="font-bold mb-2">Scoring Engine</h4>
          <p className="text-gray-600">Subscores, radar charts, funder alignment, AI improvements.</p>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h3 className="text-2xl font-bold mb-8">Trusted by early nonprofits and agencies</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-xl p-8 shadow-sm">
            <p className="mb-4">“Scoring helped us strengthen our narrative and win our first major grant.”</p>
            <div className="text-blue-600 font-semibold">— Early Access User</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-8 shadow-sm">
            <p className="mb-4">“Matching saved us hours every week. It’s like having a research assistant.”</p>
            <div className="text-blue-600 font-semibold">— Agency Partner</div>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold mb-6 text-center">Simple, transparent pricing</h3>
        <table className="w-full text-center bg-white rounded-xl shadow-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3">Plan</th>
              <th className="py-3">Features</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 font-bold">Free</td>
              <td className="py-3">Basic writing, limited AI</td>
            </tr>
            <tr>
              <td className="py-3 font-bold">Starter</td>
              <td className="py-3">Full editor, limited scoring</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="py-3 font-bold text-blue-600">Pro (Recommended)</td>
              <td className="py-3">Scoring, matching, full AI</td>
            </tr>
            <tr>
              <td className="py-3 font-bold">Agency Starter</td>
              <td className="py-3">Up to 5 clients</td>
            </tr>
            <tr>
              <td className="py-3 font-bold">Agency Unlimited</td>
              <td className="py-3">Unlimited clients + priority support</td>
            </tr>
          </tbody>
        </table>
        <div className="text-center mt-6">
          <Link to="/pricing" className="primary">View Full Pricing</Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold mb-8 text-center">How it works</h3>
        <div className="grid md:grid-cols-3 gap-10 text-center">
          <div>
            <div className="text-4xl mb-2">1️⃣</div>
            <h4 className="font-bold mb-2">Create your workspace</h4>
            <p className="text-gray-600">Set your mission, goals, and readiness.</p>
          </div>
          <div>
            <div className="text-4xl mb-2">2️⃣</div>
            <h4 className="font-bold mb-2">Write and improve your draft</h4>
            <p className="text-gray-600">Use AI to refine every section.</p>
          </div>
          <div>
            <div className="text-4xl mb-2">3️⃣</div>
            <h4 className="font-bold mb-2">Score, match, and submit</h4>
            <p className="text-gray-600">Evaluate your draft and find aligned funders.</p>
          </div>
        </div>
      </section>

      {/* AGENCY SECTION */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h3 className="text-2xl font-bold mb-8">Built for grant-writing firms</h3>
        <div className="grid md:grid-cols-3 gap-10 mb-8">
          <div className="card">Client onboarding</div>
          <div className="card">Client workspaces</div>
          <div className="card">Client scoring history</div>
          <div className="card">Client‑specific matching</div>
          <div className="card">Draft collaboration</div>
          <div className="card">CRM‑style activity timeline</div>
        </div>
        <Link to="/pricing" className="primary">Explore Agency Plans</Link>
      </section>

      {/* FINAL CTA */}
      <section className="bg-blue-600 text-white py-24 text-center">
        <h2 className="text-4xl font-bold mb-6">Start writing better grants today</h2>
        <p className="text-lg mb-10 max-w-2xl mx-auto">Your mission deserves the right tools.</p>
        <Link to="/pricing" className="px-8 py-4 bg-white text-blue-600 rounded-lg text-xl font-semibold hover:bg-gray-100 transition">Start Free</Link>
        <div className="mt-4 text-blue-100 text-sm">No credit card required.</div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-gray-500">
        <div className="mb-4">
          <Link to="/" className="mx-2">Product</Link>
          <Link to="/pricing" className="mx-2">Pricing</Link>
          <a href="/docs" className="mx-2">Documentation</a>
          <a href="/privacy" className="mx-2">Privacy</a>
          <a href="/terms" className="mx-2">Terms</a>
          <Link to="/contact" className="mx-2">Contact</Link>
        </div>
        © {new Date().getFullYear()} The Grants Master. All rights reserved.
      </footer>
    </div>
  );
}
