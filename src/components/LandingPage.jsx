

import React, { useState } from "react";
import LanguageSelector from './LanguageSelector';
import useTestAI from '../hooks/useTestAI';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

// Vite environment flag to control whether pricing is visible on the landing page.
// Set VITE_SHOW_PRICING=true to show pricing (default: hidden).
const showPricing = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SHOW_PRICING === 'true';

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
    </div>
    <span className="mt-1 text-xs text-slate-500">{tagline}</span>
    import DebugPanel from './DebugPanel';

    <ul className="mt-4 space-y-1 text-xs text-slate-600">
      {features.map((f) => (
        <li key={f}>• {f}</li>
      ))}
    </ul>

    <button
      const { data, error, isLoading, refetch, isFetching } = useTestAI({ enabled: false }); // This line remains unchanged
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
      // Debug panel is rendered only when the Vite feature flag is enabled.
      const showDebug = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_DEBUG === 'true';
    </summary>
    <p className="mt-2 text-xs text-slate-600">{answer}</p>
  </details>
);

const LandingPage = () => {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState(null);
  const { data, error, isLoading, refetch, isFetching } = useTestAI({ enabled: false });

  const handleTestAI = async () => {
    setLocalError(null);
    // store previous cache to restore on error
    const previous = queryClient.getQueryData(['test-ai']);
    // optimistic placeholder so UI feels instant
    queryClient.setQueryData(['test-ai'], { response: 'Thinking…' });
    try {
      await refetch();
    } catch (err) {
      // restore previous cache and show error
      queryClient.setQueryData(['test-ai'], previous);
      setLocalError(err?.message || 'Request failed');
    }
  };

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
            {showPricing && (
              <button className="text-sm text-slate-600 hover:text-slate-900">
                Pricing
              </button>
            )}
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
              <button
                onClick={handleTestAI}
                disabled={isFetching}
                className={
                  `ml-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ` +
                  (isFetching
                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-wait'
                    : 'border-slate-200 bg-white hover:bg-slate-50')
                }
              >
                {isFetching ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Testing…
                  </>
                ) : (
                  'Test AI'
                )}
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
              {localError && (
                <div className="mt-4 max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-sm">
                  <strong className="block text-xs">Error</strong>
                  <div className="mt-1">{localError || (error && error.message)}</div>
                </div>
              )}

              <AnimatePresence>
                {data && data.response && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                    className="mt-4 max-w-xl rounded-md border bg-white p-3 text-sm text-slate-700 shadow-sm"
                    key="ai-response"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <strong className="block text-xs text-slate-500">AI test response</strong>
                        <div className="mt-1">{data.response}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

        {showPricing && (
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
        )}

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

