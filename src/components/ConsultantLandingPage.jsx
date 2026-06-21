import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const pressurePoints = [
  'More clients',
  'More deadlines',
  'More complexity',
  'More competition',
];

const workspaceFeatures = [
  'Dedicated client folders',
  'Role-based access',
  'Client-specific templates',
  'Client history & proposal tracking',
  'Secure data separation',
];

const reportFeatures = [
  'White-label Checkmate evaluations',
  'Branded proposal drafts',
  'Client-ready PDF/Word exports',
  'Funder alignment reports',
  'Grant readiness summaries',
];

const checkmateSignals = [
  'Funder alignment',
  'Missing components',
  'Compliance issues',
  'Narrative gaps',
  'Budget inconsistencies',
];

const steveActions = [
  'Draft proposals',
  'Rewrite weak sections',
  'Improve clarity',
  'Align with funder priorities',
  'Maintain consistent tone across clients',
];

const onboardingTemplates = [
  'Client intake',
  'Program descriptions',
  'Organizational background',
  'Budget narratives',
  'Needs statements',
  'Past performance summaries',
];

const collaborationFeatures = [
  'Multi-seat access',
  'Team roles & permissions',
  'Shared templates',
  'Internal review workflows',
  'Activity logs',
  'Centralized reporting',
];

const caseStudies = [
  'A solo consultant in Manhattan increased throughput from 4 to 12 clients using TGM’s multi-client folders and Checkmate scoring.',
  'A Brooklyn agency reduced proposal turnaround time from 10 hours to 3.5 hours using Steve + Checkmate.',
  'A Queens consultant added $300k in client wins by using TGM’s funder alignment tools.',
];

const comparisonRows = [
  ['Multi-client workspace', true, false, false],
  ['White-label reports', true, false, false],
  ['Bulk scoring', true, false, false],
  ['Funder alignment', true, false, true],
  ['Client onboarding templates', true, false, false],
  ['Grant readiness score', true, false, false],
];

function BulletGrid({ items, dark = false }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className={`rounded-lg px-4 py-3 text-sm font-bold ${
            dark
              ? 'border border-white/10 bg-white/10 text-[#E8D28C]'
              : 'border border-[#E2E8F0] bg-[#F7F9FB] text-[#003A8C]'
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export default function ConsultantLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E8D28C]">Scale without hiring</p>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">
              Scale your grant consulting business — without hiring more writers.
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-8 text-[#E8D28C]">
              TGM gives consultants and agencies the power to deliver more proposals, serve more clients, and increase margins — all while maintaining quality and voice.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-[#D4AF37] px-6 py-3 font-bold text-[#0A0F1A] shadow-md transition hover:shadow-xl"
              >
                Start Free — No Credit Card
              </button>
              <a
                href="#consultant-mode"
                className="rounded-lg border border-white/30 px-6 py-3 font-bold text-white no-underline transition hover:bg-white/10"
              >
                See Consultant Mode
              </a>
            </div>
            <p className="mt-5 text-sm text-gray-300">
              Used by independent consultants, multi-client agencies, and economic development teams.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md">
            <p className="mb-4 text-sm font-bold text-[#E8D28C]">Consultant Mode Snapshot</p>
            <div className="space-y-3">
              {[
                ['Clients', 'Separate client folders and proposal tracking.'],
                ['Checkmate', 'Draft evaluation for alignment, gaps, and compliance.'],
                ['Exports', 'Client-ready drafts, reports, and summaries.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg bg-white p-4 text-gray-900">
                  <h2 className="text-sm font-bold text-[#003A8C]">{title}</h2>
                  <p className="mt-2 text-xs leading-5 text-gray-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Why consultants choose TGM</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Your workload grows. Your team doesn’t have to.</h2>
            <p className="leading-7 text-gray-600">
              Consultants face constant pressure. TGM gives you the capacity of a full grant-writing team — without the overhead.
            </p>
          </div>
          <BulletGrid items={pressurePoints} />
        </div>
      </section>

      <section id="consultant-mode" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Multi-client workspace</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Manage all your clients in one place</h2>
            <p className="mb-6 leading-7 text-gray-600">
              Everything stays organized, professional, and ready for review.
            </p>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white"
            >
              Explore Consultant Workspace →
            </button>
          </div>
          <BulletGrid items={workspaceFeatures} />
        </div>
      </section>

      <section className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">White-label reports & exports</p>
            <h2 className="mb-4 text-3xl font-bold">Deliver professional, branded reports</h2>
            <p className="leading-7 text-gray-300">
              Your clients see your brand — powered by TGM.
            </p>
          </div>
          <BulletGrid items={reportFeatures} dark />
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Bulk Checkmate scoring</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Evaluate multiple drafts in seconds</h2>
            <p className="mb-6 leading-7 text-gray-600">
              Run evaluations across multiple clients and deliver insights faster.
            </p>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white"
            >
              Try Checkmate →
            </button>
          </div>
          <BulletGrid items={checkmateSignals} />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFF9E8] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#92400E]">Steve for client work</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Your AI co-writer for every client</h2>
            <p className="leading-7 text-gray-700">
              Steve adapts to each client’s voice, mission, and funder requirements. This is how consultants scale without sacrificing quality.
            </p>
          </div>
          <BulletGrid items={steveActions} />
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Client onboarding templates</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Onboard new clients in minutes</h2>
            <p className="leading-7 text-gray-600">
              Turn client interviews into structured, reusable content.
            </p>
          </div>
          <BulletGrid items={onboardingTemplates} />
        </div>
      </section>

      <section className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Agency-level collaboration</p>
            <h2 className="mb-4 text-3xl font-bold">Built for teams and multi-writer agencies</h2>
            <p className="leading-7 text-gray-300">
              Everything your team needs to operate at scale.
            </p>
          </div>
          <BulletGrid items={collaborationFeatures} dark />
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Consultant success stories</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">How consultants grow with TGM</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {caseStudies.map((story, index) => (
              <div key={story} className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Case Study {index + 1}</p>
                <p className="text-sm leading-7 text-gray-700">{story}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Consultant differentiation</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Why consultants choose TGM over generic AI tools</h2>
            <p className="mt-3 text-gray-600">
              Generic AI tools can’t manage clients, evaluate drafts, or maintain compliance. TGM is built for professional grant writers.
            </p>
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

      <section className="bg-gradient-to-br from-[#003A8C] to-[#0A0F1A] px-6 py-20 text-center text-white">
        <h2 className="mb-4 text-4xl font-bold">Ready to scale your consulting business?</h2>
        <p className="mx-auto mb-8 max-w-xl text-gray-300">Serve more clients. Deliver better proposals. Increase your margins.</p>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="rounded-xl bg-[#D4AF37] px-10 py-4 text-lg font-bold text-[#0A0F1A] shadow-lg transition hover:shadow-2xl"
        >
          Get Started Free
        </button>
      </section>
    </div>
  );
}
