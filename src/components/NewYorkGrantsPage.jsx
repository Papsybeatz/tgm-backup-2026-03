import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const nyChallenges = [
  'Highly competitive cycles',
  'Complex compliance rules',
  'Fast-moving deadlines',
  'Dense funder landscape',
  'High expectations for alignment and clarity',
];

const grantSources = [
  'NYSCA',
  'NYSED',
  'Empire State Development',
  'NYC Arts',
  'Robin Hood Foundation',
  'Local community foundations',
  'Regional corporate funders',
];

const opportunityDetails = [
  'Eligibility',
  'Award size',
  'Deadlines',
  'Funder priorities',
  'Past award patterns',
];

const funderIntelligence = [
  'Funder alignment insights',
  'Past winner patterns',
  'Narrative expectations',
  'Budget preferences',
  'Common rejection reasons',
  'Success probability indicators',
];

const fitScoreCriteria = [
  'Mission alignment',
  'Program match',
  'Funder priorities',
  'Geographic relevance',
  'Past award trends',
  'Organizational readiness',
];

const complianceChecks = [
  'NYSCA narrative structure',
  'NYSED program requirements',
  'ESD economic impact criteria',
  'NYC Arts cultural alignment',
  'Robin Hood Foundation evidence standards',
  'Local compliance rules',
];

const checkmateSignals = [
  'NY funders',
  'NY compliance rules',
  'NY narrative gaps',
  'Missing components',
  'Budget inconsistencies',
  'Alignment issues',
];

const caseStudies = [
  'A Brooklyn youth nonprofit increased its win rate from 18% to 43% in 90 days using TGM’s NY funder alignment tools.',
  'A Queens arts organization cut proposal time from 12 hours to 3.5 hours using Checkmate + Steve.',
  'A Manhattan consultant scaled from 4 to 12 clients using TGM’s multi-client folders and white-label reports.',
];

const comparisonRows = [
  ['NY grant finder', true, false, false],
  ['NY funder intelligence', true, false, false],
  ['NY compliance checks', true, false, false],
  ['NY Grant Fit Score', true, false, false],
  ['NY templates', true, false, false],
  ['NY readiness checklist', true, false, false],
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

export default function NewYorkGrantsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E8D28C]">Local advantage for NY grant seekers</p>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">New York grants, simplified.</h1>
            <p className="mb-8 max-w-2xl text-lg leading-8 text-[#E8D28C]">
              Get a dedicated NY workspace with curated opportunities, compliance checks, funder intelligence, and a grant-ready checklist built specifically for New York nonprofits.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-[#D4AF37] px-6 py-3 font-bold text-[#0A0F1A] shadow-md transition hover:shadow-xl"
              >
                Start Free — No Credit Card
              </button>
              <Link
                to="/new-york-grants/checklist"
                className="rounded-lg border border-white/30 px-6 py-3 font-bold text-white no-underline transition hover:bg-white/10"
              >
                Download NY Grant Readiness Checklist
              </Link>
            </div>
            <p className="mt-5 text-sm text-gray-300">Trusted by NY nonprofits, consultants, and community organizations.</p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md">
            <p className="mb-4 text-sm font-bold text-[#E8D28C]">NY Workspace Includes</p>
            <div className="space-y-3">
              {[
                ['Curated NY opportunities', 'Find grants by eligibility, award size, and deadline.'],
                ['NY compliance checks', 'Catch funder-specific requirements before submission.'],
                ['NY Grant Fit Score', 'Know whether an opportunity is worth pursuing.'],
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
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Why NY needs specialization</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">New York is the most competitive grant market in the country</h2>
            <p className="leading-7 text-gray-600">
              With thousands of active nonprofits and some of the strictest funder requirements in the U.S., New York organizations face unique challenges. TGM gives NY organizations a local advantage with tools built specifically for this region.
            </p>
          </div>
          <BulletGrid items={nyChallenges} />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">NY grant finder</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Find the right NY grants — instantly</h2>
            <p className="leading-7 text-gray-600">
              Stop searching across dozens of sites. TGM curates New York-specific opportunities from the funders NY organizations already care about.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-base font-bold text-[#003A8C]">Curated sources</h3>
              <BulletGrid items={grantSources} />
            </div>
            <div>
              <h3 className="mb-3 text-base font-bold text-[#003A8C]">Every opportunity includes</h3>
              <BulletGrid items={opportunityDetails} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-8 rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white"
          >
            Browse NY Grants →
          </button>
        </div>
      </section>

      <section className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">NY funder intelligence</p>
            <h2 className="mb-4 text-3xl font-bold">Understand what NY funders actually want</h2>
            <p className="leading-7 text-gray-300">
              This is the intelligence NY nonprofits have never had — until now.
            </p>
          </div>
          <BulletGrid items={funderIntelligence} dark />
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFF9E8] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#92400E]">NY Grant Fit Score</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Know your chances before you apply</h2>
            <p className="leading-7 text-gray-700">
              Not every grant is worth pursuing. TGM helps you focus on the grants you’re most likely to win.
            </p>
          </div>
          <BulletGrid items={fitScoreCriteria} />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">NY compliance & checklist</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">Stay compliant with NY-specific requirements</h2>
            <p className="mb-6 leading-7 text-gray-600">
              New York funders have strict expectations. TGM checks your draft for NY-specific requirements, plus you get a printable NY Grant Readiness Checklist to prepare your team.
            </p>
            <Link
              to="/new-york-grants/checklist"
              className="inline-block rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white no-underline"
            >
              Download Checklist →
            </Link>
          </div>
          <BulletGrid items={complianceChecks} />
        </div>
      </section>

      <section className="bg-[#0A0F1A] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Checkmate + Steve</p>
            <h2 className="mb-4 text-3xl font-bold">Your NY-aware grant evaluation engine</h2>
            <p className="mb-6 leading-7 text-gray-300">
              Checkmate automatically detects NY funders, rules, gaps, missing components, budget inconsistencies, and alignment issues. Then Steve, your in-app assistant, fixes every weakness in one click.
            </p>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#0A0F1A]"
            >
              Try Checkmate →
            </button>
          </div>
          <BulletGrid items={checkmateSignals} dark />
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">NY success stories</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">How NY organizations use TGM to win more grants</h2>
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
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">NY-specific differentiation</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Why NY nonprofits choose TGM</h2>
            <p className="mt-3 text-gray-600">Generic tools can’t match the complexity of New York’s funding landscape. TGM is built for it.</p>
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
        <h2 className="mb-4 text-4xl font-bold">Ready to win more New York grants?</h2>
        <p className="mx-auto mb-8 max-w-xl text-gray-300">Start free today — no credit card required.</p>
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
