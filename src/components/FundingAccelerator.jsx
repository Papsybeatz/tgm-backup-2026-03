import React, { useMemo, useState } from 'react';

const DEFAULT_PROFILE = {
  projectName: 'Community Growth Initiative',
  mission: 'Expand access to practical support for underserved founders and community organizations.',
  audience: 'Early-stage nonprofits, small businesses, and local leaders',
  differentiator: 'Combines grant strategy, evidence building, and funder-ready language in one workflow',
  impact: 'Helped teams clarify programs, organize proof points, and prepare stronger applications',
  geography: 'United States',
  fundingNeed: '100000',
  sector: 'economic development',
  traction: 'pilot',
};

const SECTOR_TAGS = {
  'economic development': ['capacity building', 'jobs', 'small business', 'equity'],
  education: ['learning', 'youth', 'workforce', 'equity'],
  health: ['access', 'prevention', 'community health', 'equity'],
  environment: ['climate', 'resilience', 'clean energy', 'sustainability'],
  arts: ['culture', 'creative economy', 'community', 'education'],
};

const FUNDING_OPPORTUNITIES = [
  {
    name: 'Community Innovation Fund',
    amount: '$25K-$150K',
    deadline: 'Rolling',
    tags: ['capacity building', 'community', 'equity', 'pilot'],
    priority: 'Best first submission',
  },
  {
    name: 'Inclusive Growth Grant',
    amount: '$75K-$300K',
    deadline: 'Aug 30, 2026',
    tags: ['jobs', 'small business', 'workforce', 'equity'],
    priority: 'Strong mission fit',
  },
  {
    name: 'Regional Impact Challenge',
    amount: '$50K-$250K',
    deadline: 'Sep 15, 2026',
    tags: ['community health', 'education', 'resilience', 'outcomes'],
    priority: 'Add outcomes before applying',
  },
  {
    name: 'Scale Ready Fellowship',
    amount: '$100K-$500K',
    deadline: 'Oct 10, 2026',
    tags: ['scale', 'evidence', 'sustainability', 'leadership'],
    priority: 'High ceiling opportunity',
  },
];

const TRACTION_LABELS = {
  idea: 'Concept',
  pilot: 'Pilot active',
  growth: 'Growing traction',
  proven: 'Validated model',
};

const INTAKE_FIELDS = [
  {
    key: 'projectName',
    label: 'Project or business',
    type: 'input',
    placeholder: 'Name the initiative',
  },
  {
    key: 'mission',
    label: 'Mission',
    type: 'textarea',
    placeholder: 'What do you do and why does it matter?',
  },
  {
    key: 'audience',
    label: 'Who you serve',
    type: 'input',
    placeholder: 'Primary community, customer, or beneficiary',
  },
  {
    key: 'differentiator',
    label: 'Differentiator',
    type: 'textarea',
    placeholder: 'What makes this hard to ignore?',
  },
  {
    key: 'impact',
    label: 'Evidence or outcomes',
    type: 'textarea',
    placeholder: 'Metrics, stories, pilots, partners, or proof points',
  },
  {
    key: 'geography',
    label: 'Geography',
    type: 'input',
    placeholder: 'City, state, region, or national',
  },
];

function hasSignal(value, minimum = 20) {
  return (value || '').trim().length >= minimum;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildReadiness(profile) {
  const checks = [
    { key: 'value', label: 'Value clarity', score: hasSignal(profile.mission, 35) ? 20 : 10 },
    { key: 'audience', label: 'Defined audience', score: hasSignal(profile.audience, 12) ? 15 : 7 },
    { key: 'difference', label: 'Competitive angle', score: hasSignal(profile.differentiator, 28) ? 18 : 8 },
    { key: 'evidence', label: 'Evidence strength', score: hasSignal(profile.impact, 35) ? 22 : 8 },
    { key: 'fit', label: 'Funder fit signals', score: profile.sector && profile.fundingNeed ? 15 : 6 },
    { key: 'traction', label: 'Readiness stage', score: { idea: 5, pilot: 8, growth: 11, proven: 15 }[profile.traction] || 5 },
  ];

  const score = clampScore(checks.reduce((total, item) => total + item.score, 0));
  const label = score >= 86 ? 'Funder-ready' : score >= 72 ? 'Strong' : score >= 55 ? 'Promising' : 'Needs focus';

  return { score, label, checks };
}

function buildNarrative(profile) {
  const name = profile.projectName || 'This initiative';
  const audience = profile.audience || 'the community it serves';
  const mission = profile.mission || 'delivers a focused solution to a clearly defined need';
  const differentiator = profile.differentiator || 'a practical, user-centered model';
  const impact = profile.impact || 'early signals of demand and a clear plan to measure outcomes';

  return `${name} helps ${audience} by ${mission}. The strongest funding case is the combination of ${differentiator}. Current validation includes ${impact}. With targeted funding, the team can turn this traction into measurable, repeatable impact while giving funders a clear path from investment to outcomes.`;
}

function getEvidenceItems(profile) {
  return [
    {
      label: 'Problem proof',
      status: hasSignal(profile.mission, 45),
      suggestion: 'Add one data point that proves the need is urgent.',
    },
    {
      label: 'Beneficiary clarity',
      status: hasSignal(profile.audience, 18),
      suggestion: 'Name the specific people, organizations, or communities served.',
    },
    {
      label: 'Differentiated model',
      status: hasSignal(profile.differentiator, 35),
      suggestion: 'State why this solution is sharper than typical alternatives.',
    },
    {
      label: 'Outcome metrics',
      status: /%|\d|increase|reduced|served|trained|launched|revenue|retention/i.test(profile.impact || ''),
      suggestion: 'Add numbers: people served, dollars unlocked, time saved, or outcomes improved.',
    },
    {
      label: 'Scale logic',
      status: /scale|expand|replicate|growth|regional|national|partnership/i.test(`${profile.impact} ${profile.differentiator}`),
      suggestion: 'Explain what funding unlocks next and how the model can expand.',
    },
  ];
}

function scoreOpportunity(opportunity, profile) {
  const sectorTags = SECTOR_TAGS[profile.sector] || [];
  const profileTags = [
    ...sectorTags,
    profile.traction,
    profile.geography?.toLowerCase(),
    profile.mission?.toLowerCase(),
    profile.impact?.toLowerCase(),
  ].filter(Boolean);

  const matchCount = opportunity.tags.filter((tag) =>
    profileTags.some((profileTag) => profileTag.includes(tag) || tag.includes(profileTag))
  ).length;
  const evidenceBoost = hasSignal(profile.impact, 45) ? 10 : 0;
  const tractionBoost = profile.traction === 'proven' ? 12 : profile.traction === 'growth' ? 9 : profile.traction === 'pilot' ? 5 : 0;

  return clampScore(58 + matchCount * 8 + evidenceBoost + tractionBoost);
}

export default function FundingAccelerator() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const readiness = useMemo(() => buildReadiness(profile), [profile]);
  const narrative = useMemo(() => buildNarrative(profile), [profile]);
  const evidenceItems = useMemo(() => getEvidenceItems(profile), [profile]);
  const matches = useMemo(() => {
    return FUNDING_OPPORTUNITIES
      .map((opportunity) => ({
        ...opportunity,
        match: scoreOpportunity(opportunity, profile),
        why: opportunity.tags
          .filter((tag) => (SECTOR_TAGS[profile.sector] || []).includes(tag) || tag === profile.traction)
          .slice(0, 2),
      }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [profile]);

  const completedEvidence = evidenceItems.filter((item) => item.status).length;
  const missingEvidence = evidenceItems.filter((item) => !item.status);

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-2">TGM 1.5</p>
          <h2 className="text-3xl font-bold text-[#003A8C] mb-2">The Funding Accelerator</h2>
          <p className="text-gray-600 max-w-3xl">
            A lean command center that turns user inputs into readiness, narrative, evidence, matched funders, and competitive positioning.
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 shadow-sm min-w-[190px]">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Funding Readiness</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[#003A8C]">{readiness.score}</span>
            <span className="text-sm font-bold text-[#D4AF37] pb-1">/ 100</span>
          </div>
          <p className="text-sm font-semibold text-gray-700 mt-1">{readiness.label}</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-[#0A0F1A]">Funding clarity intake</h3>
              <p className="text-sm text-gray-500 mt-1">Seven inputs power the accelerator.</p>
            </div>
            <button
              type="button"
              onClick={() => setProfile(DEFAULT_PROFILE)}
              className="text-xs font-bold text-[#003A8C] border border-[#E2E8F0] rounded-lg px-3 py-2 hover:border-[#D4AF37] transition"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-4">
            {INTAKE_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={profile[field.key]}
                    onChange={(event) => updateProfile(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-gray-800 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                ) : (
                  <input
                    value={profile[field.key]}
                    onChange={(event) => updateProfile(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-gray-800 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                )}
              </label>
            ))}

            <div className="grid md:grid-cols-3 gap-4">
              <label className="block md:col-span-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Sector</span>
                <select
                  value={profile.sector}
                  onChange={(event) => updateProfile('sector', event.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-gray-800 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                >
                  {Object.keys(SECTOR_TAGS).map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Stage</span>
                <select
                  value={profile.traction}
                  onChange={(event) => updateProfile('traction', event.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-gray-800 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                >
                  {Object.entries(TRACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Funding need</span>
                <input
                  type="number"
                  min="0"
                  value={profile.fundingNeed}
                  onChange={(event) => updateProfile('fundingNeed', event.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-gray-800 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="bg-[#0A0F1A] text-white rounded-xl p-6 shadow-sm border border-[#0A0F1A]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[#E8D28C] text-xs font-bold uppercase tracking-widest mb-2">Instant funding narrative</p>
                <h3 className="text-xl font-bold text-white">Funder-ready summary</h3>
              </div>
              <span className="inline-flex w-fit rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#0A0F1A]">
                Ready to paste
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-200">{narrative}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0A0F1A]">Evidence engine</h3>
                  <p className="text-sm text-gray-500">{completedEvidence} of {evidenceItems.length} proof points ready</p>
                </div>
                <span className="text-sm font-bold text-[#003A8C]">{Math.round((completedEvidence / evidenceItems.length) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden mb-4">
                <div
                  className="h-full bg-[#D4AF37]"
                  style={{ width: `${(completedEvidence / evidenceItems.length) * 100}%` }}
                />
              </div>
              <div className="space-y-3">
                {evidenceItems.map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#E2E8F0] p-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${item.status ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                        {item.status ? 'Y' : '!'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{item.label}</p>
                        {!item.status && <p className="text-xs text-gray-500 mt-1">{item.suggestion}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#0A0F1A] mb-1">Competitive snapshot</h3>
              <p className="text-sm text-gray-500 mb-4">Positioning angles TGM can surface for funders.</p>
              <div className="space-y-3">
                {[
                  `Leads with ${profile.sector.replace('-', ' ')} relevance and a clear beneficiary focus.`,
                  `Differentiates through ${profile.differentiator || 'a sharper implementation model'}.`,
                  missingEvidence.length
                    ? `Next strongest move: ${missingEvidence[0].suggestion}`
                    : 'Evidence base is strong enough to support a confident funding ask.',
                ].map((item) => (
                  <div key={item} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                    <p className="text-sm text-gray-700 leading-5">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#0A0F1A]">Best matches for you</h3>
                <p className="text-sm text-gray-500">Prioritized by sector tags, stage, evidence, and fit signals.</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-[#003A8C]">Opportunity matching</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {matches.map((match) => (
                <div key={match.name} className="rounded-xl border border-[#E2E8F0] p-4 bg-[#F8FAFC]">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="text-sm font-bold text-[#003A8C] leading-5">{match.name}</h4>
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-1 text-xs font-bold text-[#065F46]">{match.match}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Amount: <span className="font-bold text-gray-700">{match.amount}</span></p>
                  <p className="text-xs text-gray-500 mb-3">Deadline: <span className="font-bold text-gray-700">{match.deadline}</span></p>
                  <p className="text-xs font-semibold text-[#92400E] bg-[#FEF9C3] rounded-lg px-3 py-2">{match.priority}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    Why: {match.why.length ? match.why.join(', ') : 'mission and readiness fit'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
