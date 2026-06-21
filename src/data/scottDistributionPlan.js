export const SCOTT_FUNNELS = [
  {
    id: 'ny',
    name: 'NY Funnel',
    target: 'NY nonprofits, arts orgs, community orgs, youth orgs, and human services organizations.',
    entryPoints: ['NY Grants page', 'NY lead magnet', 'NY webinars', 'NY LinkedIn posts', 'NY outreach'],
    ctas: ['Explore NY Grants', 'Run NY Grant Fit Score', 'Download NY Readiness Checklist', 'Start Free', 'Lifetime Access (Limited)'],
  },
  {
    id: 'consultant',
    name: 'Consultant Funnel',
    target: 'Solo consultants, agencies, and multi-client grant firms.',
    entryPoints: ['Consultant landing page', 'Consultant outreach', 'Consultant LinkedIn posts', 'Consultant webinars', 'Consultant case studies'],
    ctas: ['See Consultant Mode', 'Create your first client folder', 'Run bulk scoring', 'White-label Checkmate report', 'Lifetime Access (Limited)'],
  },
  {
    id: 'general_nonprofit',
    name: 'General Nonprofit Funnel',
    target: 'All other nonprofits.',
    entryPoints: ['Homepage', 'Pricing page', 'LinkedIn content', 'Email sequences'],
    ctas: ['Start Free', 'Run Checkmate', 'Draft your first proposal', 'Lifetime Access (Limited)'],
  },
];

export const SCOTT_EMAIL_SEQUENCES = [
  {
    id: 'ny',
    name: 'NY Email Sequence',
    emails: [
      {
        title: 'Your NY Grant Readiness Score',
        subject: 'Your NY Grant Readiness Score',
        body: [
          'Hey — since you’re in New York, you get access to TGM’s NY-specific workspace.',
          'Start by checking your NY Grant Readiness Score. It takes 30 seconds and shows:',
          'How aligned you are with NY funders',
          'What’s missing from your proposals',
          'What to fix before deadlines hit',
        ],
        cta: 'Run your NY Readiness Score',
      },
      {
        title: 'Top NY funders and what they look for',
        subject: 'What NY funders actually look for',
        body: [
          'New York funders are competitive — and they’re predictable once you know the patterns.',
          'Inside TGM’s NY workspace, you’ll see:',
          'NYSCA narrative expectations',
          'NYSED program requirements',
          'ESD economic impact criteria',
          'NYC Arts cultural alignment',
          'Robin Hood evidence standards',
          'This is the intelligence NY nonprofits never had before.',
        ],
        cta: 'Explore NY funder intelligence',
      },
      {
        title: 'Why NY proposals get rejected',
        subject: 'The #1 reason NY proposals get rejected',
        body: [
          'Most NY proposals don’t fail because of writing — they fail because of misalignment.',
          'TGM’s Checkmate engine scans your draft for:',
          'NY compliance issues',
          'Missing components',
          'Narrative gaps',
          'Budget inconsistencies',
          'Funder alignment problems',
          'Run it once and you’ll see exactly what reviewers see.',
        ],
        cta: 'Run Checkmate on your draft',
      },
      {
        title: 'NY deadlines coming up',
        subject: 'NY deadlines coming up — don’t miss these',
        body: [
          'New York deadlines move fast.',
          'Your NY workspace tracks:',
          'NYSCA deadlines',
          'NYSED deadlines',
          'ESD deadlines',
          'NYC Arts deadlines',
          'Local foundation cycles',
          'If you’ve got something coming up, start your draft now — TGM will structure it for you.',
        ],
        cta: 'Start your NY draft',
      },
      {
        title: 'Lifetime Access for NY orgs (Limited)',
        subject: 'Lifetime Access for NY orgs (Limited)',
        body: [
          'We’re giving early NY organizations a Lifetime Access option — one payment, Pro plan forever.',
          'Unlimited drafts',
          'Checkmate Pro',
          'NY funder intelligence',
          'NY compliance rules',
          'Grant Fit Score',
          'Team seats (1)',
          'All future updates',
          'It’s limited to the first 200 users.',
        ],
        cta: 'Unlock Lifetime Access',
      },
    ],
  },
  {
    id: 'consultant',
    name: 'Consultant Email Sequence',
    emails: [
      ['How to scale your consulting business without hiring', 'Create client folder'],
      ['White-label reports that impress clients', 'Export Checkmate report'],
      ['Bulk scoring = 10x throughput', 'Run bulk scoring'],
      ['Client templates that save hours', 'Add templates'],
      ['Lifetime Access for consultants (Limited)', 'Unlock Lifetime Access'],
    ],
  },
];

export const SCOTT_LINKEDIN_ROTATION = [
  {
    id: 'ny_content',
    name: 'NY Content',
    topics: ['NY deadlines', 'NY funder insights', 'NY case studies', 'NY compliance tips'],
  },
  {
    id: 'consultant_content',
    name: 'Consultant Content',
    topics: ['Scaling without hiring', 'White-label reports', 'Client folders', 'Bulk scoring'],
  },
  {
    id: 'grant_tips',
    name: 'Grant Writing Tips',
    topics: ['Alignment', 'Narrative clarity', 'Budgeting', 'Common rejection reasons'],
  },
  {
    id: 'founder_content',
    name: 'Founder Content',
    topics: ['Behind the scenes', 'Product updates', 'Wins', 'Lessons'],
  },
];

export const SCOTT_OUTREACH_TRACKS = [
  {
    id: 'ny',
    name: 'NY Outreach Track',
    targets: 'NY nonprofits.',
    messages: [
      'Hey, saw you are in NY — we built a NY-specific grant workspace.',
      'Here is your NY Readiness Checklist.',
      'Want me to run a free NY Grant Fit Score for you?',
      'Lifetime Access is open for NY orgs — want the link?',
    ],
  },
  {
    id: 'consultant',
    name: 'Consultant Outreach Track',
    targets: 'Consultants and agencies.',
    messages: [
      'Hey, saw you do grant consulting — we built a multi-client workspace.',
      'Want a white-label Checkmate report to test?',
      'Bulk scoring saves consultants 10+ hours/week.',
      'Lifetime Access is open for consultants — want the link?',
    ],
  },
];

export const SCOTT_WEEKLY_ASSETS = [
  ['Case Studies', ['NY orgs', 'Consultants', 'Agencies']],
  ['Templates', ['Needs statements', 'Program descriptions', 'Budget narratives', 'NY-specific templates']],
  ['Guides', ['How to win NY grants', 'How consultants scale with AI', 'How to improve alignment']],
  ['Checklists', ['NY readiness', 'Consultant onboarding', 'Grant alignment']],
];

export const SCOTT_DEADLINE_ENGINE = {
  monitors: ['NY deadlines', 'Federal deadlines', 'Foundation deadlines', 'Consultant cycles'],
  triggers: ['LinkedIn posts', 'Email reminders', 'DM nudges', 'Start a draft now CTAs'],
};

export const SCOTT_OPERATING_SYSTEM = {
  daily: ['1 LinkedIn post', '10-20 outreach messages', '1 NY insight or consultant insight', '1 deadline reminder if applicable'],
  weekly: ['1 case study', '1 template', '1 guide', '1 email broadcast'],
  monthly: ['1 webinar', '1 major funnel push', '1 Lifetime scarcity push'],
};

export const SCOTT_LIFETIME_CTA = [
  'Only X spots left',
  'NY orgs get priority access',
  'Consultants get lifetime access for their business',
  'Lifetime ends Friday',
  'Lifetime unlocks Pro forever',
];

export function getTodaysScottRotation(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  const content = SCOTT_LINKEDIN_ROTATION[dayIndex % SCOTT_LINKEDIN_ROTATION.length];
  const funnel = SCOTT_FUNNELS[dayIndex % SCOTT_FUNNELS.length];
  const outreach = SCOTT_OUTREACH_TRACKS[dayIndex % SCOTT_OUTREACH_TRACKS.length];
  const lifetimeCta = SCOTT_LIFETIME_CTA[dayIndex % SCOTT_LIFETIME_CTA.length];

  return {
    content,
    funnel,
    outreach,
    lifetimeCta,
    dailyTasks: SCOTT_OPERATING_SYSTEM.daily,
  };
}
