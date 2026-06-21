import React, { useMemo } from 'react';
import {
  SCOTT_DEADLINE_ENGINE,
  SCOTT_EMAIL_SEQUENCES,
  SCOTT_FUNNELS,
  SCOTT_LIFETIME_CTA,
  SCOTT_LINKEDIN_ROTATION,
  SCOTT_OPERATING_SYSTEM,
  SCOTT_OUTREACH_TRACKS,
  SCOTT_WEEKLY_ASSETS,
  getTodaysScottRotation,
} from '../data/scottDistributionPlan';

function Card({ title, eyebrow, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-widest text-amber-700">{eyebrow}</p>}
      <h2 className="mb-4 text-xl font-black text-[#003A8C]">{title}</h2>
      {children}
    </section>
  );
}

function PillList({ items }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ScottDistributionPage() {
  const today = useMemo(() => getTodaysScottRotation(new Date()), []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-amber-700">Scott Distribution Engine</p>
          <h1 className="text-4xl font-black text-[#003A8C]">Daily growth operating system</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Scott runs TGM distribution through funnels, email engines, LinkedIn content, outreach, weekly assets, and deadline triggers.
          </p>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFFBEB] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Today&apos;s Funnel</p>
            <p className="mt-2 text-lg font-black text-[#003A8C]">{today.funnel.name}</p>
          </div>
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFFBEB] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">LinkedIn Type</p>
            <p className="mt-2 text-lg font-black text-[#003A8C]">{today.content.name}</p>
          </div>
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFFBEB] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Outreach Track</p>
            <p className="mt-2 text-lg font-black text-[#003A8C]">{today.outreach.name}</p>
          </div>
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FFFBEB] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Lifetime CTA</p>
            <p className="mt-2 text-lg font-black text-[#003A8C]">{today.lifetimeCta}</p>
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-[#003A8C]">Today&apos;s Execution Checklist</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {today.dailyTasks.map((task) => (
              <label key={task} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" className="mt-1" />
                <span>{task}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {SCOTT_FUNNELS.map((funnel) => (
            <Card key={funnel.id} title={funnel.name} eyebrow="Funnel">
              <p className="mb-4 text-sm leading-6 text-slate-600">{funnel.target}</p>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Entry Points</p>
              <PillList items={funnel.entryPoints} />
              <p className="mb-2 mt-4 text-xs font-black uppercase tracking-widest text-slate-500">CTAs</p>
              <PillList items={funnel.ctas} />
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {SCOTT_EMAIL_SEQUENCES.map((sequence) => (
            <Card key={sequence.id} title={sequence.name} eyebrow="Email Engine">
              <div className="grid gap-3">
                {sequence.emails.map(([subject, cta], index) => (
                  <div key={subject} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Email {index + 1}</p>
                    <p className="mt-1 font-black text-slate-900">{subject}</p>
                    <p className="mt-2 text-sm font-bold text-[#003A8C]">CTA: {cta}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card title="LinkedIn Daily Rotation" eyebrow="Content Engine">
            <div className="grid gap-3 md:grid-cols-2">
              {SCOTT_LINKEDIN_ROTATION.map((bucket) => (
                <div key={bucket.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 font-black text-[#003A8C]">{bucket.name}</p>
                  <PillList items={bucket.topics} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Deadline Trigger System" eyebrow="Deadline Engine">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Scott Monitors</p>
            <PillList items={SCOTT_DEADLINE_ENGINE.monitors} />
            <p className="mb-2 mt-4 text-xs font-black uppercase tracking-widest text-slate-500">When Deadlines Are Near</p>
            <PillList items={SCOTT_DEADLINE_ENGINE.triggers} />
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {SCOTT_OUTREACH_TRACKS.map((track) => (
            <Card key={track.id} title={track.name} eyebrow="Outreach Engine">
              <p className="mb-4 text-sm font-semibold text-slate-600">Targets: {track.targets}</p>
              <div className="grid gap-3">
                {track.messages.map((message, index) => (
                  <div key={message} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                    <span className="mr-2 font-black text-[#003A8C]">Message {index + 1}:</span>{message}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card title="Weekly Asset Factory" eyebrow="Weekly">
            <div className="grid gap-3">
              {SCOTT_WEEKLY_ASSETS.map(([label, items]) => (
                <div key={label}>
                  <p className="mb-2 text-sm font-black text-[#003A8C]">{label}</p>
                  <PillList items={items} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Operating Cadence" eyebrow="Daily / Weekly / Monthly">
            <p className="mb-2 text-sm font-black text-[#003A8C]">Daily</p>
            <PillList items={SCOTT_OPERATING_SYSTEM.daily} />
            <p className="mb-2 mt-4 text-sm font-black text-[#003A8C]">Weekly</p>
            <PillList items={SCOTT_OPERATING_SYSTEM.weekly} />
            <p className="mb-2 mt-4 text-sm font-black text-[#003A8C]">Monthly</p>
            <PillList items={SCOTT_OPERATING_SYSTEM.monthly} />
          </Card>

          <Card title="Lifetime Deal Integration" eyebrow="Conversion Accelerant">
            <PillList items={SCOTT_LIFETIME_CTA} />
          </Card>
        </div>
      </div>
    </div>
  );
}
