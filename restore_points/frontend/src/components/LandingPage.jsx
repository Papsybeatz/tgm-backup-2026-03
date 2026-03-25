

import React from "react";
import LanguageSelector from './LanguageSelector';

const FeatureCard = ({ title, description }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </div>
);

const PricingCard = ({ name, price, tagline, features, highlighted }) => (
  <div
    className={
      `flex flex-col rounded-2xl border p-4 text-sm ` +
      (highlighted
        ? "border-[#004aad] bg-white shadow-md shadow-blue-500/20"
        : "border-slate-200 bg-white")
    }
  >
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {name}
    </span>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-2xl font-bold text-slate-900">{price}</span>
      <span className="text-xs text-slate-500">/mo</span>
    </div>
    <span className="mt-1 text-xs text-slate-500">{tagline}</span>

    <ul className="mt-4 space-y-1 text-xs text-slate-600">
      {features.map((f) => (
        <li key={f}>• {f}</li>
      ))}
    </ul>

    <button
      className={
        `mt-5 w-full rounded-full px-3 py-2 text-xs font-semibold ` +
        (highlighted
          ? "bg-[#004aad] text-white hover:bg-blue-700"
          : "bg-slate-900 text-white hover:bg-slate-800")
      }
    >
      Choose {name}
    </button>
  </div>
);

const FaqItem = ({ question, answer }) => (
  <details className="group rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-slate-800">
      <span>{question}</span>
      <span className="text-slate-400 group-open:rotate-90">›</span>
    </summary>
    <p className="mt-2 text-xs text-slate-600">{answer}</p>
  </details>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#004aad]" />
            <span className="text-lg font-semibold tracking-tight">
              GrantsMaster
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-sm text-slate-600 hover:text-slate-900">
              Pricing
            </button>
            <button className="text-sm text-slate-600 hover:text-slate-900">
              FAQ
            </button>
            {/* Language Selector */}
            <div className="flex items-center gap-1 text-sm">
              <LanguageSelector />
            </div>
            <button className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="bg-gradient-to-b from-white to-slate-50">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center md:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              The fastest, smartest way to draft, validate, and win more grants.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              GrantsMaster is an AI‑powered grant‑writing agent for nonprofits,
              agencies, and consultants—built to remove barriers to funding.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 md:flex-row">
              <button className="rounded-full bg-[#004aad] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/30 hover:bg-blue-700">
                Get Started Free
              </button>
              <div className="flex flex-col text-xs text-slate-500 md:flex-row md:items-center md:gap-3">
                <span>✓ No credit card required</span>
                <span>✓ Cancel anytime</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-col items-center gap-3 text-xs text-slate-500 md:text-sm">
              <span>Trusted by agencies, nonprofits, and consultants</span>
              <div className="flex gap-4 text-2xl">
                <span>🏆</span>
                <span>🤝</span>
                <span>💼</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE HIGHLIGHTS */}
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
              Built for real‑world grant work
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Everything you need to go from idea to funder‑ready proposal in minutes.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <FeatureCard
                title="AI‑powered drafting"
                description="Generate tailored grant drafts in minutes, not weeks, using your organization’s real context."
              />
              <FeatureCard
                title="Compliance validation"
                description="Built‑in checks to align with funder requirements and reduce rejection risk."
              />
              <FeatureCard
                title="Team collaboration"
                description="Invite teammates or clients, comment on drafts, and keep everything in one workspace."
              />
              <FeatureCard
                title="Export to PDF/Word"
                description="Download polished proposals ready to submit or share with stakeholders."
              />
              <FeatureCard
                title="Agent refinement (Pro+)"
                description="Use advanced guidance to iteratively improve clarity, alignment, and impact."
              />
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-18">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
              Plans & Pricing
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Start free, then scale as your grant pipeline grows.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-5">
              <PricingCard
                name="Free"
                price="$0"
                tagline="Get started"
                features={[
                  "5 drafts per month",
                  "Basic validator",
                ]}
              />
              <PricingCard
                name="Starter"
                price="$19.99"
                tagline="For solo founders"
                features={[
                  "5 drafts per month",
                  "Downloadable proposals",
                  "1 team seat",
                ]}
              />
              <PricingCard
                name="Pro"
                price="$49"
                tagline="Most popular"
                highlighted
                features={[
                  "Unlimited drafts",
                  "Advanced agent guidance",
                  "Analytics dashboard",
                ]}
              />
              <PricingCard
                name="Agency Starter"
                price="$79"
                tagline="For small teams"
                features={[
                  "Up to 10 seats",
                  "Unlimited drafts",
                  "5 client workspaces",
                ]}
              />
              <PricingCard
                name="Agency Unlimited"
                price="$249"
                tagline="Scale without limits"
                features={[
                  "Unlimited seats",
                  "Unlimited drafts",
                  "Full white‑label",
                ]}
              />
            </div>

            <div className="mt-8 text-center">
              <button className="text-sm font-medium text-[#004aad] hover:underline">
                See all features & pricing
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-18">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              FAQs
            </h3>
            <div className="mt-4 space-y-3">
              <FaqItem
                question="Is GrantsMaster a replacement for human grant writers?"
                answer="No. It’s a force multiplier—helping teams move faster, explore more opportunities, and polish drafts before submission."
              />
              <FaqItem
                question="Can small nonprofits really use the free plan?"
                answer="Yes. The free tier is designed specifically so small, under‑resourced organizations can still access quality drafts."
              />
              <FaqItem
                question="Do you support agencies and consultants?"
                answer="Absolutely. Agency plans include multiple seats, client workspaces, and white‑label options."
              />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 md:flex-row">
          <span>© {new Date().getFullYear()} GrantsMaster. All rights reserved.</span>
          <div className="flex gap-4">
            <button className="hover:text-slate-700">Privacy</button>
            <button className="hover:text-slate-700">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

