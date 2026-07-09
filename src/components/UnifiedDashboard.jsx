import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { TIERS } from '../config/tiers';
import BillingPortalButton from './BillingPortalButton';
import DraftsList from './DraftsList';
import FundingAccelerator from './FundingAccelerator';
import { NY_GRANT_OPPORTUNITIES, NY_READINESS_CHECKLIST } from '../data/newYorkGrants';

const FEATURE_MAP = {
  aiDraft:     ['starter','pro','agency_starter','agency_unlimited','lifetime'],
  compliance:  ['pro','agency_starter','agency_unlimited','lifetime'],
  workspace:   ['pro','agency_starter','agency_unlimited','lifetime'],
  reviewer:    ['agency_starter','agency_unlimited','lifetime'],
  funderMatch: ['agency_unlimited','lifetime'],
};

const TIER_META = {
  free:             { label: 'Free',             color: '#475569', bg: '#F1F5F9' },
  starter:          { label: 'Starter',          color: '#1D4ED8', bg: '#EFF6FF' },
  pro:              { label: 'Pro',              color: '#92400E', bg: '#FEF9C3' },
  agency_starter:   { label: 'Agency',           color: '#166534', bg: '#F0FDF4' },
  agency_unlimited: { label: 'Agency+',          color: '#065F46', bg: '#ECFDF5' },
  lifetime:         { label: 'Lifetime',         color: '#7E22CE', bg: '#FDF4FF' },
};

function FreeDashboard() {
  const navigate = useNavigate();
  const [draftCount, setDraftCount] = React.useState(0);
  const [showStarterPreview, setShowStarterPreview] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/drafts', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setDraftCount(Array.isArray(data?.drafts) ? data.drafts.length : 0);
      })
      .catch(() => {
        if (!cancelled) setDraftCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <section className="border-b border-[#E2E8F0] bg-white px-6 py-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_320px] md:items-start">
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#B8960C]">Free Tier</p>
              <button
                type="button"
                onClick={() => setShowStarterPreview(true)}
                className="text-xs font-bold text-[#003A8C] no-underline transition hover:text-[#B8960C]"
              >
                Upgrade to Starter →
              </button>
            </div>
            <h1 className="text-3xl font-bold text-[#0A0F1A]">Welcome to TGM Free</h1>
            <span className="mt-2 inline-flex rounded-full border border-[#003A8C]/20 bg-[#003A8C]/5 px-2.5 py-1 text-[11px] font-semibold text-[#003A8C]">
              Free Tier — Basic Tools
            </span>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
              Your AI-powered grant workspace starts here.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>Create your first draft with guided AI assistance.</li>
              <li>Upgrade to Starter to unlock full drafting, scoring, templates, and unlimited drafts.</li>
            </ul>
          </div>

          <aside className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Workspace</p>
            <h2 className="mt-2 text-xl font-bold text-[#003A8C]">Your Drafts ({Math.min(draftCount, 1)} of 1)</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">No drafts yet. Create your first one below.</p>
          </aside>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-base font-bold text-[#003A8C]">What you can do on Free</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>Create one draft</li>
                <li>Use AI to outline and structure your grant</li>
                <li>Save and edit your draft anytime</li>
                <li>Draft Limit: 1 (Free Tier)</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-base font-bold text-[#003A8C]">What’s locked until upgrade</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>Full AI drafting</li>
                <li>Scoring and validation</li>
                <li>Funder matching</li>
                <li>Templates library</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#E2E8F0] bg-white px-6 py-8 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/workspace/new-draft')}
              className="rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0A0F1A] transition hover:bg-[#E8D28C]"
            >
              Create Draft
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-[#003A8C] px-6 py-3 text-sm font-bold text-[#003A8C] transition hover:bg-[#003A8C]/5"
            >
              Export PDF
            </button>
          </div>
        </section>
      </main>

      {showStarterPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-[#0A0F1A]">Starter unlocks</h3>
              <button
                type="button"
                onClick={() => setShowStarterPreview(false)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-slate-300"
              >
                Close
              </button>
            </div>

            <ul className="space-y-2.5 text-sm text-slate-700">
              <li>Full AI drafting</li>
              <li>Unlimited drafts</li>
              <li>Scoring</li>
              <li>Funder matching</li>
              <li>Templates</li>
              <li>Multi-section generation</li>
            </ul>

            <Link
              to="/plans"
              className="mt-4 block rounded-lg bg-[#0A0F1A] px-4 py-2 text-center text-sm font-semibold text-[#D4AF37] no-underline"
            >
              Upgrade to Starter
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

function StarterDashboard({ tierConfig }) {
  const navigate = useNavigate();
  const starterFeatures = [
    {
      title: 'Draft workspace',
      detail: 'Create and manage your grant drafts from one focused workspace.',
      action: 'Create Draft',
      onClick: () => navigate('/workspace/new-draft'),
    },
    {
      title: 'AI drafting help',
      detail: 'Use assisted writing and rewrite tools to move from blank page to funder-ready language.',
      action: 'Open Workspace',
      onClick: () => navigate('/workspace/new-draft'),
    },
    {
      title: 'Score and match',
      detail: 'Use Starter scoring and basic funder fit checks while advanced team tools stay on Plans.',
      action: 'View Plans',
      to: '/plans',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">
      <section className="border-b border-[#E2E8F0] bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">TGM Starter</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0A0F1A]">TGM Dashboard - Starter Plan</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
              Full drafting, scoring, and funder fit unlocked.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {[
                'Starter - Unlimited Drafts',
                'Starter - Full Drafting Assistant',
                'Starter - Grant Fit Score Enabled',
              ].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-[#003A8C]/20 bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#003A8C]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-[#FFFFFF] to-[#F8FAFC] px-5 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Plan</p>
            <p className="text-xl font-extrabold text-[#003A8C]">{tierConfig.name}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B8960C]">Starter Primary Action</p>
            <h2 className="mt-2 text-xl font-bold text-[#003A8C]">Start a New Draft</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Create a full proposal with Steve&apos;s drafting assistant.
            </p>
            <button
              type="button"
              onClick={() => navigate('/workspace/new-draft')}
              className="mt-4 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#0A0F1A] transition hover:bg-[#E8D28C]"
            >
              Create Draft
            </button>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B8960C]">Starter Tooling</p>
            <h2 className="mt-2 text-xl font-bold text-[#003A8C]">Funder Fit Tools</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Analyze alignment with funder priorities using Starter-level fit checks.
            </p>
            <button
              type="button"
              onClick={() => navigate('/workspace/fit')}
              className="mt-4 rounded-lg border border-[#003A8C] px-4 py-2 text-sm font-bold text-[#003A8C] transition hover:bg-[#003A8C]/5"
            >
              Check Fit
            </button>
          </div>
        </section>

        <section className="mb-10 grid gap-5 md:grid-cols-3">
          {starterFeatures.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-white to-[#FAFCFF] p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-extrabold tracking-tight text-[#003A8C]">{feature.title}</h2>
              <p className="mb-5 text-sm leading-6 text-gray-600">{feature.detail}</p>
              {feature.to ? (
                <Link to={feature.to} className="text-sm font-bold text-[#003A8C] no-underline hover:text-[#B8960C]">
                  {feature.action}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={feature.onClick}
                  className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#0A0F1A] transition hover:bg-[#E8D28C]"
                >
                  {feature.action}
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#003A8C]">What Starter Unlocks</h2>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {[
              'Full AI drafting',
              'Unlimited drafts',
              'Grant Fit Score',
              'Basic funder matching',
              'Rewrite + improve tools',
              'Multi-section generation',
            ].map((item) => (
              <li key={item} className="rounded-md bg-[#F8FAFC] px-3 py-2.5 font-medium">{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <DraftsList />
        </section>
      </main>

    </div>
  );
}

export default function UnifiedDashboard() {
  const { user } = useUser() || {};
  const navigate = useNavigate();
  const tier = user?.tier || 'free';
  const tierConfig = TIERS[tier] || TIERS.free;
  const meta = TIER_META[tier] || TIER_META.free;
  const isNewYorkUser = user?.location === 'new_york';

  const unlocked = (key) => FEATURE_MAP[key]?.includes(tier);

  if (tier === 'free') {
    return <FreeDashboard />;
  }

  if (tier === 'starter') {
    return <StarterDashboard tierConfig={tierConfig} />;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-gray-900">



      {/* HERO */}
      <section className="bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#E8D28C] text-xs font-bold uppercase tracking-widest mb-3">TGM 1.5 is live</p>
          <h2 className="text-3xl font-bold mb-2">The Funding Accelerator Dashboard</h2>
          <p className="text-[#E8D28C] text-lg mb-8">
            Turn value, readiness, evidence, funder fit, and positioning into a faster path to funding.
          </p>
          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Plan',       value: tierConfig.name },
              { label: 'Drafts',     value: tierConfig.limits?.drafts === Infinity ? 'Unlimited' : tierConfig.limits?.drafts ?? 0 },
              { label: 'Readiness',   value: 'Live' },
              { label: 'Team Seats', value: tierConfig.limits?.teamSeats === Infinity ? 'Unlimited' : tierConfig.limits?.teamSeats === 0 ? '—' : tierConfig.limits?.teamSeats },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 border border-white/15 rounded-xl px-5 py-3 min-w-[100px]">
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
                <p className="text-lg font-bold text-[#D4AF37]">{value}</p>
              </div>
            ))}
            {tier === 'free' && (
              <Link to="/plans" className="flex items-center gap-2 bg-[#D4AF37] rounded-xl px-5 py-3 text-[#0A0F1A] font-bold text-sm no-underline self-center ml-2">
                ⚡ Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      </section>

      <FundingAccelerator />

      {isNewYorkUser && (
        <section className="max-w-7xl mx-auto px-6 pt-12">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">New York mode</p>
                <h3 className="text-2xl font-bold text-[#003A8C]">NY Grants, Deadlines, and Readiness</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Your dashboard is showing New York-specific opportunities because you selected New York during onboarding.
                </p>
              </div>
              <Link to="/new-york-grants" className="rounded-lg border border-[#003A8C] px-4 py-2 text-sm font-bold text-[#003A8C] no-underline transition hover:bg-[#003A8C] hover:text-white">
                Open NY Grants →
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-base font-bold text-[#0A0F1A]">NY Grant Finder</h4>
                  <span className="rounded-full bg-[#003A8C]/10 px-3 py-1 text-xs font-bold text-[#003A8C]">Filter: New York</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {NY_GRANT_OPPORTUNITIES.map((grant) => (
                    <div key={grant.id} className="rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h5 className="text-sm font-bold text-[#003A8C]">{grant.name}</h5>
                        <span className="whitespace-nowrap rounded-full bg-[#D4AF37]/20 px-2 py-1 text-[11px] font-bold text-[#92400E]">{grant.deadline}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-500">{grant.amount}</p>
                      <p className="mt-2 text-xs leading-5 text-gray-600">{grant.fit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-base font-bold text-[#0A0F1A]">NY Readiness Checklist</h4>
                  <Link to="/new-york-grants/checklist" className="text-xs font-bold text-[#003A8C] no-underline">
                    Print PDF →
                  </Link>
                </div>
                <div className="space-y-2">
                  {NY_READINESS_CHECKLIST.slice(0, 5).map((item) => (
                    <div key={item} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DRAFTS — primary action area */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <DraftsList />
      </section>

      {/* FEATURE GRID */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#003A8C]">Platform Features</h3>
          <Link to="/plans" className="text-sm font-semibold text-[#003A8C] border border-[#E2E8F0] px-4 py-1.5 rounded-lg no-underline hover:border-[#D4AF37] transition">
            View all plans →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'aiDraft',     label: 'Funding Narrative Generator', icon: '✍️', desc: 'Translate user data into funder-ready summaries, briefs, and pitch language.' },
            { key: 'compliance',  label: 'Evidence & Validation Engine', icon: '✅', desc: 'Surface proof points, missing evidence, and funder-friendly validation language.' },
            { key: 'funderMatch', label: 'Opportunity Matching',         icon: '🎯', desc: 'Prioritize the highest-fit funders and explain why each match is strong.' },
            { key: 'aiDraft',     label: 'AI Grant Drafting',          icon: '✍️', desc: 'Generate funder-ready proposals in minutes.' },
            { key: 'compliance',  label: 'Compliance Validator',        icon: '✅', desc: 'Auto-check drafts against funder requirements.' },
            { key: 'workspace',   label: 'Team Workspace',              icon: '👥', desc: 'Collaborate with your team in real time.' },
            { key: 'reviewer',    label: 'AI Reviewer Engine',          icon: '🔍', desc: 'Simulate reviewer feedback before submission.' },
            { key: 'funderMatch', label: 'Funder Match Intelligence',   icon: '🎯', desc: 'AI-curated funder recommendations for your mission.' },
          ].map((f) => (
            <div key={`${f.key}-${f.label}`} className={`p-6 rounded-xl shadow-md border transition
              ${unlocked(f.key)
                ? 'bg-white border-[#D4AF37]/40 hover:shadow-lg hover:border-[#D4AF37]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
                  ${unlocked(f.key) ? 'bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30' : 'bg-[#F1F5F9]'}`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-[#003A8C] flex items-center gap-2">
                  {f.label}
                  {unlocked(f.key)
                    ? <span className="text-[#D4AF37] text-sm">✓</span>
                    : <span className="text-gray-400 text-sm">🔒</span>}
                </h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{f.desc}</p>
              {unlocked(f.key)
                ? <button onClick={() => navigate(`/workspace/${f.key}`)}
                    className="text-sm font-bold text-[#003A8C] hover:text-[#D4AF37] transition">
                    Open →
                  </button>
                : <Link to="/plans" className="text-sm font-bold text-gray-400 hover:text-[#003A8C] transition no-underline">
                    Upgrade to unlock →
                  </Link>}
            </div>
          ))}
        </div>
      </section>

      {/* AI ENGINE PANEL */}
      <section className="py-20 bg-[#0A0F1A] text-white text-center px-6">
        <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Powered by the GrantsMaster AI Engine</p>
        <h2 className="text-3xl font-bold text-[#D4AF37] mb-4">Your Smartest Grant Writing Partner</h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-10">
          Generate drafts, refine clarity, and align with funder requirements using our award-winning AI.
        </p>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 text-left">
          {[
            { stat: '10x', label: 'Faster than manual drafting' },
            { stat: '94%', label: 'Funder alignment score' },
            { stat: '$2M+', label: 'Grants won by users' },
          ].map(({ stat, label }) => (
            <div key={stat} className="bg-white/10 rounded-xl p-6 border border-white/10">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">{stat}</p>
              <p className="text-gray-300 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>



      {/* BILLING & SUBSCRIPTION */}
      <section className="py-12 max-w-6xl mx-auto px-6">
        <h3 className="text-lg font-bold text-[#0A0F1A] mb-4">Billing & Subscription</h3>
        <BillingPortalButton />
      </section>

      {/* FINAL CTA — tier-aware */}
      {(tier === 'lifetime' || tier === 'agency_unlimited') ? (
        <section className="py-16 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
          <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">
            {tier === 'lifetime' ? 'Lifetime Member' : 'Agency+'}
          </p>
          <h2 className="text-3xl font-bold mb-3">You have full access.</h2>
          <p className="text-gray-300 max-w-lg mx-auto mb-8 text-base">
            {tier === 'lifetime'
              ? 'Every feature is unlocked — forever. Thank you for being a founding member of GrantsMaster.'
              : 'All agency features are active. Manage unlimited clients, workspaces, and funder matches.'}
          </p>
          <Link to="/dashboard"
            className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition no-underline">
            Go to Dashboard →
          </Link>
        </section>
      ) : tier === 'pro' || tier === 'agency_starter' ? (
        <section className="py-16 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
          <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Unlock more power</p>
          <h2 className="text-3xl font-bold mb-3">
            {tier === 'pro' ? 'Ready to scale to Agency?' : 'Upgrade to Agency+'}
          </h2>
          <p className="text-gray-300 max-w-lg mx-auto mb-8 text-base">
            {tier === 'pro'
              ? 'Add multi-client workspaces, AI reviewer, and funder match intelligence.'
              : 'Remove all limits — unlimited clients, seats, and funder match intelligence.'}
          </p>
          <Link to="/plans"
            className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition no-underline">
            View Upgrade Options →
          </Link>
        </section>
      ) : tier === 'starter' ? (
        <section className="py-16 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
          <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Unlock the full GrantsMaster experience</p>
          <h2 className="text-3xl font-bold mb-3">Ready to go Pro?</h2>
          <p className="text-gray-300 max-w-lg mx-auto mb-8 text-base">
            Unlock compliance validation, team workspaces, and the AI reviewer engine.
          </p>
          <Link to="/plans"
            className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition no-underline">
            Explore Pro & Agency →
          </Link>
        </section>
      ) : (
        /* free */
        <section className="py-20 bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] text-white text-center px-6">
          <p className="text-[#D4AF37] font-semibold mb-2 text-sm uppercase tracking-widest">Unlock the full GrantsMaster experience</p>
          <h2 className="text-4xl font-bold mb-6">Ready to elevate your grant writing?</h2>
          <Link to="/plans"
            className="inline-block px-10 py-4 bg-[#D4AF37] text-[#0A0F1A] rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition no-underline">
            Explore Full Access
          </Link>
        </section>
      )}

    </div>
  );
}
