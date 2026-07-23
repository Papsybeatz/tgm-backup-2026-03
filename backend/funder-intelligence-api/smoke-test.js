#!/usr/bin/env node
/**
 * TGM Funder Intelligence API — Production Smoke Test
 *
 * Usage:
 *   node smoke-test.js https://your-railway-url.up.railway.app
 *
 * Runs every endpoint in sequence. Prints PASS/FAIL for each.
 * Exit code 0 = all passed. Exit code 1 = at least one failure.
 */

const BASE_URL = process.argv[2];

if (!BASE_URL) {
  console.error('\nUsage: node smoke-test.js <base-url>');
  console.error('Example: node smoke-test.js https://tgm-funder-api.up.railway.app\n');
  process.exit(1);
}

const url = (path) => `${BASE_URL.replace(/\/$/, '')}${path}`;
let passed = 0;
let failed = 0;
let API_KEY = null;
let FUNDER_ID = null;
let BATCH_ID = null;
let CYCLE_ID = null;

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✅  PASS — ${label}`);
    passed++;
  } catch (error) {
    console.log(`  ❌  FAIL — ${label}`);
    console.log(`       ${error.message}`);
    failed++;
  }
}

async function post(path, body, headers = {}) {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

const sampleApplication = {
  id: 'smoke_app_001',
  org_profile: {
    organization_type: 'nonprofit',
    country: 'usa',
  },
  project_summary: 'STEM education and workforce readiness for low-income youth with measurable outcomes, data, and impact metrics.',
  narratives: [
    'Our baseline data shows 45% placement rate; target is 70% within 12 months using evidence-based curriculum.',
    'Program combines tutoring, mentorship, and employer partnerships for sustainable workforce outcomes.',
  ],
  budget: {
    total: 200000,
    admin_cost: 40000,
    program_cost: 130000,
  },
  metadata: {
    geography: 'usa',
    cycle: 'smoke-test-cycle',
  },
  attachments: [{ name: 'logic-model.pdf' }, { name: 'budget.xlsx' }],
};

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TGM Funder Intelligence API — Smoke Test');
  console.log(`  Target: ${BASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await check('GET /health → 200 ok', async () => {
    const res = await fetch(url('/health'));
    const body = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (body.status !== 'ok') throw new Error(`Expected status "ok", got "${body.status}"`);
  });

  await check('POST /funder/register → 201 with funder_id + api_key', async () => {
    const { status, body } = await post('/funder/register', {
      name: 'Smoke Test Foundation',
      mission: 'Advance STEM education and workforce readiness in underserved communities.',
      priority_areas: ['STEM education', 'workforce readiness', 'equity'],
      geographies: ['usa'],
      eligibility_rules: [{ type: 'organization_type', allowed: ['nonprofit'] }],
      rubric_definition: {
        criteria: [
          { name: 'Impact Potential', weight: 45, description: 'Expected measurable outcomes, KPI rigor, and community reach.' },
          { name: 'Execution Plan', weight: 35, description: 'Operational readiness, timeline, partnerships, delivery mechanics.' },
          { name: 'Budget Credibility', weight: 20, description: 'Budget realism and direct linkage to outcomes.' },
        ],
      },
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`);
    if (!body.funder_id) throw new Error('Missing funder_id in response');
    if (!body.api_key) throw new Error('Missing api_key in response');
    API_KEY = body.api_key;
    FUNDER_ID = body.funder_id;
    console.log(`         funder_id: ${FUNDER_ID}`);
    console.log(`         api_key:   ${API_KEY}`);
  });

  if (!API_KEY || !FUNDER_ID) {
    console.log('\n  ⛔  Cannot continue — registration failed. Fix /funder/register first.\n');
    process.exit(1);
  }

  const authHeaders = { 'x-api-key': API_KEY };

  await check('POST /application/score → 200 with overall_score + scores_by_criterion', async () => {
    const { status, body } = await post('/application/score', { funder_id: FUNDER_ID, application: sampleApplication }, authHeaders);
    if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`);
    if (!Number.isFinite(body.overall_score)) throw new Error('Missing or invalid overall_score');
    if (!Array.isArray(body.scores_by_criterion)) throw new Error('Missing scores_by_criterion array');
    if (!body.suggested_next_step) throw new Error('Missing suggested_next_step');
    console.log(`         overall_score:      ${body.overall_score}`);
    console.log(`         confidence:         ${body.confidence}`);
    console.log(`         risk_score:         ${body.risk_score}`);
    console.log(`         suggested_next_step: ${body.suggested_next_step}`);
  });

  await check('POST /application/funder-fit → 200 with fit_score + recommended_band', async () => {
    const { status, body } = await post('/application/funder-fit', { funder_id: FUNDER_ID, application: sampleApplication }, authHeaders);
    if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`);
    if (!Number.isFinite(body.fit_score)) throw new Error('Missing or invalid fit_score');
    if (!['reject', 'review', 'fast-track'].includes(body.recommended_band)) throw new Error(`Invalid recommended_band: ${body.recommended_band}`);
    console.log(`         fit_score:        ${body.fit_score}`);
    console.log(`         eligibility_pass: ${body.eligibility_pass}`);
    console.log(`         recommended_band: ${body.recommended_band}`);
  });

  await check('POST /batch/score → 200 with cohort_analytics + shortlist', async () => {
    const { status, body } = await post('/batch/score', {
      funder_id: FUNDER_ID,
      cycle_id: 'smoke-test-cycle',
      applications: [
        sampleApplication,
        {
          ...sampleApplication,
          id: 'smoke_app_002',
          project_summary: 'Digital literacy and workforce readiness for rural youth in the USA with outcome data.',
        },
        {
          ...sampleApplication,
          id: 'smoke_app_003',
          project_summary: 'Community health navigator training program for underserved populations.',
        },
      ],
    }, authHeaders);
    if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`);
    if (!Array.isArray(body.applications)) throw new Error('Missing applications array');
    if (!body.cohort_analytics) throw new Error('Missing cohort_analytics');
    if (!body.cohort_analytics.shortlist?.length) throw new Error('Shortlist is empty');
    BATCH_ID = body.batch_id;
    CYCLE_ID = body.cycle_id;
    console.log(`         batch_id:               ${BATCH_ID}`);
    console.log(`         cycle_id:               ${CYCLE_ID}`);
    console.log(`         avg_composite_score:    ${body.cohort_analytics.average_composite_score}`);
    console.log(`         shortlist_count:        ${body.cohort_analytics.shortlist.length}`);
  });

  await check('POST /cycle/intelligence → 200 with alignment_heatmap + shortlist_suggestions', async () => {
    const { status, body } = await post('/cycle/intelligence', {
      funder_id: FUNDER_ID,
      cycle_id: CYCLE_ID,
      batch_id: BATCH_ID,
    }, authHeaders);
    if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`);
    if (!body.intelligence) throw new Error('Missing intelligence block');
    if (!Array.isArray(body.intelligence.alignment_heatmap)) throw new Error('Missing alignment_heatmap');
    if (!Array.isArray(body.intelligence.shortlist_suggestions)) throw new Error('Missing shortlist_suggestions');
    console.log(`         heatmap_entries:    ${body.intelligence.alignment_heatmap.length}`);
    console.log(`         shortlist_count:    ${body.intelligence.shortlist_suggestions.length}`);
  });

  await check('POST /webhook/config → 200 with test_event', async () => {
    const { status, body } = await post('/webhook/config', {
      funder_id: FUNDER_ID,
      url: 'https://example.org/webhooks/tgm-smoke-test',
      auth: { type: 'bearer', token_hint: 'configured-out-of-band' },
      mapping: {
        move_to_committee_review: 'committee_review',
        needs_program_officer_review: 'program_officer_review',
        auto_reject_or_request_revision: 'decline_or_revise',
      },
    }, authHeaders);
    if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`);
    if (!body.test_event) throw new Error('Missing test_event in response');
    console.log(`         webhook_url:   ${body.webhook.url}`);
    console.log(`         test_event:    ${body.test_event.event}`);
  });

  await check('GET /funder/:funderId → 200 with funder record', async () => {
    const res = await fetch(url(`/funder/${FUNDER_ID}`), { headers: authHeaders });
    const body = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    if (!body.funder) throw new Error('Missing funder in response');
    if (body.funder.id !== FUNDER_ID) throw new Error('funder_id mismatch');
    console.log(`         name: ${body.funder.name}`);
  });

  await check('Missing API key → 401', async () => {
    const { status } = await post('/application/score', { funder_id: FUNDER_ID, application: sampleApplication });
    if (status !== 401) throw new Error(`Expected 401 without API key, got ${status}`);
  });

  await check('Invalid API key → 401', async () => {
    const { status } = await post('/application/score', { funder_id: FUNDER_ID, application: sampleApplication }, { 'x-api-key': 'tgm_fi_invalid_key' });
    if (status !== 401) throw new Error(`Expected 401 with invalid API key, got ${status}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('\n  🚀  ALL SYSTEMS GO. Sidecar is production-ready.');
    console.log(`\n  📋  Save these for your pilot:\n`);
    console.log(`      FUNDER_ID: ${FUNDER_ID}`);
    console.log(`      API_KEY:   ${API_KEY}`);
  } else {
    console.log('\n  🔴  Some checks failed. Review errors above before sending to funders.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('\n[SMOKE TEST] Fatal error:', error.message);
  process.exit(1);
});
