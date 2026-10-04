import React from 'react';
import Clock from './Clock';

type DashboardHeroProps = {
  eyebrow: string;
  planName: string;
  title: string;
  subtitle: string;
};

/**
 * DashboardHero — the compact dashboard header.
 *
 * Replaces the old hero that stated the plan three times ("TGM Starter",
 * "TGM Dashboard - Starter Plan", three "Starter - …" badges, and a "Plan /
 * Starter" box) and left a large empty area beside the text. The plan now
 * appears once as a small pill, and the clock occupies the old empty space.
 */
export default function DashboardHero({ eyebrow, planName, title, subtitle }: DashboardHeroProps) {
  return (
    <section className="border-b border-[#E2E8F0] bg-white px-6 py-8">
      {/* Grid rather than flex-col/md:flex-row: src/index.css ships unlayered
          .flex-col / .items-center duplicates, and unlayered CSS beats
          Tailwind's layered md: variants, so flex-col never became a row. */}
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B8960C]">{eyebrow}</p>
            <span className="rounded-full border border-[#003A8C]/20 bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#003A8C]">
              {planName} plan
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A0F1A] md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-gray-600">{subtitle}</p>
        </div>
        <Clock />
      </div>
    </section>
  );
}
