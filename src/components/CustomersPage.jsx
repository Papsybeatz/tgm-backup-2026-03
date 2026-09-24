import React from 'react';
import { Link } from 'react-router-dom';

const REGIONS = ['New York', 'Texas', 'California', 'Virginia', 'Canada'];

const WORKFLOWS = [
  {
    title: 'Development Director, youth services nonprofit',
    body: 'Writes 8-12 proposals a year with no dedicated grant writer. Uses Steve to draft the first pass, then Checkmate to catch missing components and compliance issues before submitting.',
  },
  {
    title: 'Solo grant consultant',
    body: 'Manages several client portfolios at once. Uses client folders and bulk Checkmate scoring to review each draft against funder criteria before it reaches the client.',
  },
  {
    title: 'Program Manager, arts nonprofit',
    body: 'Runs every narrative against the funder\u2019s published rubric to see which scored criteria the draft does not answer, then fixes those sections the same day.',
  },
];

export default function CustomersPage() {
  return (
    <div className="w-full min-h-screen bg-white text-gray-900">

      <section className="bg-gradient-to-br from-[#0A0F1A] to-[#003A8C] px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E8D28C]">Customers</p>
          <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">We&apos;re early. We&apos;d rather earn proof than fake it.</h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-200">
            We don&apos;t publish invented testimonials, initials-only case studies, or outcome numbers we can&apos;t stand behind.
            Here is exactly what we can show you today.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Real users, real places</p>
              <p className="text-sm leading-6 text-gray-700">
                Nonprofits and agencies in {REGIONS.slice(0, 4).join(', ')}, and {REGIONS[4]} use TGM today.
              </p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">A named founder</p>
              <p className="text-sm leading-6 text-gray-700">
                Built by Thomas Clottey of Gee Oh Dee (Tech) LLC &mdash; reachable by phone and email. No anonymous AI wrapper.
              </p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FB] p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">Judge the product, not the copy</p>
              <p className="text-sm leading-6 text-gray-700">
                Run your own draft through Checkmate, free, with no credit card. Test the output yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9FB] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">How teams use TGM</p>
          <h2 className="mb-8 text-3xl font-black text-[#0A0F1A]">Workflow examples &mdash; no outcome figures attached</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {WORKFLOWS.map((w) => (
              <div key={w.title} className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="mb-3 text-sm font-bold text-[#003A8C]">{w.title}</p>
                <p className="text-sm leading-6 text-gray-700">{w.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-gray-600">
            These are descriptions of how the product is used, not named customer case studies. Named case studies publish only with
            written permission, and will appear here when users approve them.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-[#D4AF37]/40 bg-[#FFF9E8] p-8 text-center">
          <h2 className="mb-3 text-2xl font-black text-[#0A0F1A]">Using TGM and getting results?</h2>
          <p className="mb-6 leading-7 text-gray-700">
            We&apos;d like to feature your experience &mdash; on your terms, quoted only with your written permission.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="mailto:support@thegrantsmaster.com?subject=My%20TGM%20story"
              className="rounded-lg bg-[#003A8C] px-6 py-3 text-sm font-bold text-white no-underline"
            >
              Tell us your story →
            </a>
            <Link
              to="/trust"
              className="rounded-lg border border-[#003A8C] px-6 py-3 text-sm font-bold text-[#003A8C] no-underline"
            >
              Read our Trust &amp; Transparency commitment →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#92400E]">Honest by default</p>
          <p className="leading-7 text-gray-700">
            We treat every outward claim as either verifiable, demonstrable, or honestly staged. Right now our customer proof is
            honestly staged: real users, a named company, and a product you can test. That changes as users approve being named
            &mdash; not before.
          </p>
        </div>
      </section>

    </div>
  );
}
