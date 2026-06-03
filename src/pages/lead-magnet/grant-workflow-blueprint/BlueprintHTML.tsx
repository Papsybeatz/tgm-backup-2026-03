import React from 'react';

/**
 * BlueprintHTML
 *
 * A print/PDF-ready HTML rendering of the Grant Workflow Blueprint.
 * Styled with inline styles and Tailwind-compatible classes for portability.
 *
 * To generate a PDF:
 *   1. Navigate to /lead-magnet/grant-workflow-blueprint/pdf in the browser
 *   2. Use window.print() or a headless Chrome tool (Puppeteer, wkhtmltopdf)
 *
 * Route: /lead-magnet/grant-workflow-blueprint/pdf
 */

const STEPS = [
  {
    number: '01',
    title: 'Map the Funder Before You Write',
    time: '45 min',
    description:
      'Read the funder\'s last 3 grants (not just their guidelines). Identify their priority outcomes, preferred language, and theory of change. Score your org\'s alignment on a 1-10 scale before opening a blank page.',
    actions: [
      'Pull the funder\'s last 3 grant awards from their website or 990',
      'List their top 3 priority outcomes in their exact language',
      'Score your org\'s mission alignment: 1 (weak) → 10 (strong)',
      'If score < 6, consider a different funder for this cycle',
    ],
  },
  {
    number: '02',
    title: 'Build the Proposal Skeleton',
    time: '30 min',
    description:
      'Use the standard grant structure as a skeleton. Fill in the funder-specific language from Step 1 before writing any narrative. This prevents the most common failure: writing for your org instead of the funder.',
    actions: [
      'Open the proposal template for this grant type',
      'Insert funder\'s priority language into section headers',
      'Write one sentence per section stating the funder-aligned outcome',
      'Get internal sign-off on the skeleton before writing full narrative',
    ],
  },
  {
    number: '03',
    title: 'Write the Narrative — Impact First',
    time: '90 min',
    description:
      'Lead every section with the outcome, not the activity. Funders fund results. "We will serve 200 families" is an activity. "200 families will reduce household debt by an average of $4,200" is an outcome.',
    actions: [
      'Write the impact statement for each section first',
      'Add the activities that produce the impact second',
      'Mirror the funder\'s exact language from Step 1 throughout',
      'Cut any sentence that describes what you do without stating why it matters to the funder',
    ],
  },
  {
    number: '04',
    title: 'Build the Budget to Match the Narrative',
    time: '45 min',
    description:
      'Every budget line must connect to a narrative outcome. Funders reject budgets that don\'t match the story. Build the budget after the narrative, not before.',
    actions: [
      'List every activity from the narrative',
      'Assign a cost to each activity',
      'Write a one-line budget justification for each line item',
      'Verify total matches the funder\'s stated grant range',
    ],
  },
  {
    number: '05',
    title: 'Run the Pre-Submission Checklist',
    time: '30 min',
    description:
      'The 12-point review that catches the mistakes funders reject proposals for. Do this before anyone else reads the draft.',
    actions: [
      '☐ Funder\'s priority language appears in the first paragraph',
      '☐ Every section leads with an outcome, not an activity',
      '☐ Budget totals match the narrative activities exactly',
      '☐ All required attachments are included and named correctly',
      '☐ Word/page limits are respected in every section',
      '☐ Org name, EIN, and contact info are correct throughout',
      '☐ Theory of change aligns with funder\'s model',
      '☐ Evaluation plan includes specific, measurable indicators',
      '☐ Sustainability plan addresses what happens after the grant period',
      '☐ Letters of support are signed and dated',
      '☐ Submission portal account is active and tested',
      '☐ Submission deadline confirmed — not the postmark date',
    ],
  },
  {
    number: '06',
    title: 'Build the Reuse Library',
    time: '20 min',
    description:
      'After every proposal, extract the reusable components. A grant writer with a strong library cuts proposal time by 50%+ on every subsequent grant.',
    actions: [
      'Save the org description paragraph to your library',
      'Save the impact statement for each program area',
      'Save the budget justification language',
      'Tag each saved piece with: funder type, program area, grant size',
    ],
  },
];

export default function BlueprintHTML() {
  return (
    <div style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      maxWidth: 800, margin: '0 auto', padding: '48px 40px',
      color: '#0A0F1A', lineHeight: 1.6,
      background: '#fff',
    }}>

      {/* Cover */}
      <div style={{
        background: 'linear-gradient(135deg, #0A0F1A 0%, #003A8C 100%)',
        borderRadius: 12, padding: '48px 40px', marginBottom: 48, textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          The Grants Master
        </p>
        <h1 style={{ margin: '0 0 16px', fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
          Grant Workflow Blueprint
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 16, color: 'rgba(255,255,255,.75)' }}>
          The 6-step system that cuts proposal time from 12 hours to 3.5 hours
          and improves win rates by 40%+
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          {[
            { value: '3.5 hrs', label: 'Per proposal' },
            { value: '41%',     label: 'Win rate' },
            { value: '$180k',   label: 'In 90 days' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#D4AF37' }}>{value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.55)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intro */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>How to use this blueprint</h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>
          This blueprint is a repeatable workflow — not a writing guide. Follow the steps in order
          for every grant proposal. The time estimates assume you have your org's core materials
          (mission statement, program descriptions, financials) already documented.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
          Total time per proposal: <strong>~4.5 hours</strong> (vs. the industry average of 12 hours).
          After your first 3 proposals, expect this to drop to under 3 hours as your reuse library grows.
        </p>
      </div>

      {/* Steps */}
      {STEPS.map((step, i) => (
        <div key={step.number} style={{
          marginBottom: 40,
          borderLeft: '3px solid #003A8C',
          paddingLeft: 24,
          pageBreakInside: 'avoid',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#003A8C', letterSpacing: '0.08em' }}>
              STEP {step.number}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>~{step.time}</span>
          </div>
          <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#0A0F1A' }}>
            {step.title}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#374151' }}>
            {step.description}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {step.actions.map((action) => (
              <li key={action} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#374151' }}>
                <span style={{ color: '#003A8C', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                {action}
              </li>
            ))}
          </ul>
          {i < STEPS.length - 1 && (
            <div style={{ marginTop: 32, borderBottom: '1px solid #F0F0F0' }} />
          )}
        </div>
      ))}

      {/* CTA footer */}
      <div style={{
        marginTop: 56, padding: '32px 36px', textAlign: 'center',
        background: '#F8F9FC', borderRadius: 12, border: '1px solid #EAECF0',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0A0F1A' }}>
          Run this workflow inside TGM
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>
          TGM automates Steps 1 and 2 — funder alignment scoring and proposal skeleton generation.
          Free tier. No credit card.
        </p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#003A8C' }}>
          thegrantsmaster.com/signup
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          @page { margin: 20mm; }
        }
      `}</style>

    </div>
  );
}
