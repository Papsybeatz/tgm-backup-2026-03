import React from 'react';
import { Link } from 'react-router-dom';
import { NY_READINESS_CHECKLIST } from '../data/newYorkGrants';

export default function NewYorkChecklistPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#B8960C]">TGM New York Grants</p>
            <h1 className="text-3xl font-bold text-[#003A8C]">NY Grant Readiness Checklist</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Use this before drafting, matching, or submitting a New York-focused grant application.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#003A8C] px-4 py-2 text-sm font-bold text-white print:hidden"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="space-y-4">
          {NY_READINESS_CHECKLIST.map((item, index) => (
            <div key={item} className="flex gap-4 rounded-lg border border-[#E2E8F0] bg-[#F7F9FB] p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-[#0A0F1A]">
                {index + 1}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0A0F1A]">{item}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Prepare this evidence before turning the opportunity into a final narrative, budget, or submission packet.
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-[#0A0F1A] p-5 text-white print:bg-white print:text-gray-900">
          <h2 className="text-lg font-bold text-[#D4AF37] print:text-[#003A8C]">Next step</h2>
          <p className="mt-2 text-sm leading-6">
            Open TGM, choose your NY opportunity, and use the assistant to turn these materials into a funder-ready summary, budget narrative, and submission checklist.
          </p>
        </div>

        <Link to="/new-york-grants" className="mt-6 inline-block text-sm font-bold text-[#003A8C] no-underline print:hidden">
          Back to NY Grants
        </Link>
      </div>
    </div>
  );
}
