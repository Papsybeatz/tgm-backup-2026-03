import React from 'react';
import { Link } from 'react-router-dom';

const PILLARS = [
  {
    kicker: 'Steve',
    title: 'Drafting assistant',
    body: 'Describe your program and Steve produces a funder-ready first draft \u2014 narrative, need statement, goals, outcomes, and budget narrative \u2014 in one pass. You edit; you never start from a blank page.',
    points: ['Full proposal structure', 'Funder-responsive sections', 'Editable output, not a black box'],
  },
  {
    kicker: 'Checkmate',
    title: 'Pre-submission scoring',
    body: 'Checkmate evaluates the draft before a funder ever sees it, scoring funder alignment, compliance, narrative strength, and budget consistency against the criteria that gate the award.',
    points: ['Funder alignment', 'Missing components', 'Compliance issues', 'Narrative gaps', 'Budget inconsistencies'],
  },
  {
    kicker: 'Grant Intelligence',
    title: 'Funder intelligence engine',
    body: 'TGM turns scattered funder signals into practical decisions your team can act on before the deadline \u2014 alignment rules, past winner patterns, award benchmarks, and success indicators.',
    points: ['Funder alignment rules', 'Past winner analysis', 'Award size benchmarks', 'Success probability indicator'],
  },
  {
    kicker: 'NY Intelligence',
    title: 'New York funder module',
    body: 'Our deepest dataset covers NYSCA, NYSED, ESD, NYC Arts, and Robin Hood rules, deadlines, and grant opportunities \u2014 then the same workspace handles federal, foundation, and international work.',
    points: ['NYSCA / NYSED / ESD / NYC Arts / Robin Hood rules', 'Curated NY opportunities and reminders', 'NY Grant Fit Score', 'NY Grant Readiness Checklist'],
  },
  {
    kicker: 'Consultant Mode',
    title: 'Multi-client workflows',
    body: 'Built for consultants and agencies managing several clients at once \u2014 client folders, white-label reports, bulk scoring, and onboarding templates so you scale throughput without dropping quality.',
    points: ['Multi-client folders', 'White-label reports & exports', 'Bulk Checkmate scoring', 'Team collaboration'],
  },
  {
    kicker: 'Security',
    title: 'Data practices for sensitive proposals',
    body: 'Grant proposals carry sensitive budgets and strategy. TGM protects them with encryption and human-in-the-loop workflows designed around SOC 2 principles.',
    points: ['Encrypted at rest and in transit', 'Payments processed by Stripe', 'Human-in-the-loop workflows', 'Transparent AI governance'],
  },
];

export default function FeaturesPage() {
  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E8D28C]">Features</p>
          <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">Everything your grant team needs in one workspace</h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-200">
            Drafting, funder intelligence, compliance checks, and pre-submission scoring \u2014 one workflow from blank page to
            reviewer-ready submission.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0A0F1A] no-underline">
              Start free — no credit card →
            </Link>
            <Link to="/pricing" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white no-underline">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B8960C]">{p.kicker}</p>
              <h2 className="mb-3 text-2xl font-black text-[#0A0F1A]">{p.title}</h2>
              <p className="mb-5 text-sm leading-7 text-gray-700">{p.body}</p>
              <ul className="space-y-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm font-semibold text-[#003A8C]">
                    <span aria-hidden="true" className="mt-0.5 text-[#D4AF37]">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Built for grants</p>
            <h2 className="text-3xl font-black text-[#0A0F1A]">One workflow for grant capacity and intelligence</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#0A0F1A] text-white">
                <tr>
                  {['Capability', 'TGM', 'Generic writing tools', 'Grant tracking tools'].map((h) => (
                    <th key={h} className="px-5 py-4 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Grant drafting', true, true, false],
                  ['Funder alignment', true, false, true],
                  ['Compliance scoring', true, false, false],
                  ['NY personalization', true, false, false],
                  ['Grant readiness score', true, false, false],
                  ['Consultant mode', true, false, false],
                ].map(([feature, tgm, genericWriting, grantTracking]) => (
                  <tr key={feature} className="border-t border-[#E2E8F0]">
                    <td className="px-5 py-4 font-semibold text-gray-800">{feature}</td>
                    {[tgm, genericWriting, grantTracking].map((enabled, i) => (
                      <td key={`${feature}-${i}`} className="px-5 py-4">
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

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-black text-[#0A0F1A]">Test the output, not the marketing</h2>
          <p className="mb-7 leading-7 text-gray-700">
            Run your own draft through Checkmate, free, with no credit card. Judge the product on your real work.
          </p>
          <Link to="/signup" className="rounded-lg bg-[#003A8C] px-7 py-3.5 text-sm font-bold text-white no-underline">
            Start free →
          </Link>
        </div>
      </section>

    </div>
  );
}
