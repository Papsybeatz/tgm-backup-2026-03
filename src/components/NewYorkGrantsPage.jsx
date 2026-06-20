import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NY_GRANT_OPPORTUNITIES, NY_READINESS_CHECKLIST, NY_ASSISTANT_PROMPTS } from '../data/newYorkGrants';

export default function NewYorkGrantsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E8D28C]">New York grant support</p>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">
              AI-powered grant writing for New York nonprofits and grant seekers.
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-8 text-[#E8D28C]">
              Find NY-aligned opportunities, prepare stronger narratives, organize proof points, and stay ahead of recurring deadlines without losing the global power of TGM.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-[#D4AF37] px-6 py-3 font-bold text-[#0A0F1A] shadow-md transition hover:shadow-xl"
              >
                Start Free
              </button>
              <Link
                to="/pricing"
                className="rounded-lg border border-white/30 px-6 py-3 font-bold text-white no-underline transition hover:bg-white/10"
              >
                View Plans
              </Link>
              <Link
                to="/new-york-grants/checklist"
                className="rounded-lg border border-white/30 px-6 py-3 font-bold text-white no-underline transition hover:bg-white/10"
              >
                NY Checklist
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md">
            <p className="mb-4 text-sm font-bold text-[#E8D28C]">NY Grant Snapshot</p>
            <div className="space-y-3">
              {NY_GRANT_OPPORTUNITIES.slice(0, 3).map((grant) => (
                <div key={grant.id} className="rounded-lg bg-white p-4 text-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-bold text-[#003A8C]">{grant.name}</h2>
                    <span className="whitespace-nowrap rounded-full bg-[#D4AF37]/20 px-2 py-1 text-[11px] font-bold text-[#92400E]">
                      {grant.deadline}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">{grant.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Local relevance, global platform</p>
            <h2 className="text-3xl font-bold text-[#0A0F1A]">Built for NY workflows without excluding anyone else.</h2>
            <p className="mt-3 text-gray-600">
              TGM stays universal. New York users get a localized layer for deadlines, funder language, readiness checks, and opportunity matching.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              ['NY Grants Filter', 'Surface New York-aligned opportunities by focus area, deadline, and funder fit.'],
              ['NY Deadline Calendar', 'Keep upcoming application cycles visible before the final week rush.'],
              ['NY Readiness Checklist', 'Package proof points, compliance materials, and budget notes in funder-friendly form.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold text-[#003A8C]">{title}</h3>
                <p className="text-sm leading-6 text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Readiness</p>
            <h2 className="mb-4 text-3xl font-bold text-[#0A0F1A]">NY Grant Readiness Checklist</h2>
            <p className="text-gray-600">
              Use this checklist before drafting, matching, or submitting so your organization looks clear, credible, and ready.
            </p>
            <Link
              to="/new-york-grants/checklist"
              className="mt-5 inline-block rounded-lg bg-[#003A8C] px-5 py-3 text-sm font-bold text-white no-underline"
            >
              Open Printable Checklist
            </Link>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              {NY_READINESS_CHECKLIST.map((item) => (
                <div key={item} className="rounded-lg bg-[#F7F9FB] px-4 py-3 text-sm font-semibold text-gray-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0F1A] px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">TGM Assistant</p>
          <h2 className="mb-6 text-3xl font-bold">NY-ready prompts when you need them.</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {NY_ASSISTANT_PROMPTS.map((prompt) => (
              <div key={prompt} className="rounded-xl border border-white/10 bg-white/10 p-5 text-sm font-bold text-[#E8D28C]">
                {prompt}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
