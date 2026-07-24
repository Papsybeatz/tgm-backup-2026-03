const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('node:http');

const app = require('../../backend/funder-intelligence-api/app');
const { databasePath } = require('../../backend/funder-intelligence-api/lib/datastore');

function resetSidecarDatabase() {
  const emptyDb = {
    funders: {},
    apiKeys: {},
    webhooks: {},
    batches: {},
    cycles: {},
    auditLogs: [],
    enterpriseOrgs: {},
    rubricDrafts: {},
    metrics: { requests: [], alerts: [] },
    supportTickets: {},
    monthlyReports: {},
  };
  fs.mkdirSync(require('path').dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, JSON.stringify(emptyDb, null, 2), 'utf8');
}

test('Funder Intelligence API v1 workflow', async () => {
  resetSidecarDatabase();

  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const webhookEvents = [];

  const webhookReceiver = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        webhookEvents.push(JSON.parse(raw || '{}'));
      } catch (_error) {
        webhookEvents.push({ invalid_json: true });
      }
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((resolve) => webhookReceiver.listen(0, resolve));
  const webhookAddress = webhookReceiver.address();
  const webhookUrl = `http://127.0.0.1:${webhookAddress.port}/events`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const body = await response.json();
    return { response, body };
  }

  try {
    const register = await request('/funder/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Impact First Foundation',
        mission: 'Advance youth STEM and workforce readiness.',
        priority_areas: ['STEM education', 'workforce readiness', 'equity'],
        geographies: ['usa', 'jamaica'],
        eligibility_rules: [{ type: 'organization_type', allowed: ['nonprofit'] }],
        rubric_definition: {
          criteria: [
            { name: 'Impact Potential', weight: 45, description: 'Expected measurable outcomes and KPI rigor.' },
            { name: 'Execution Plan', weight: 35, description: 'Operational readiness, timeline, partnerships, and delivery mechanics.' },
            { name: 'Budget Credibility', weight: 20, description: 'Budget realism and direct linkage to outcomes.' },
          ],
        },
      }),
    });

    assert.equal(register.response.status, 201);
    assert.ok(register.body.funder_id);
    assert.ok(register.body.api_key);
    const apiKey = register.body.api_key;
    const funderId = register.body.funder_id;

    const sampleApplication = {
      id: 'app_001',
      org_profile: {
        organization_type: 'nonprofit',
        country: 'usa',
      },
      project_summary: 'We provide STEM education and workforce readiness for low-income youth with measurable outcomes.',
      narratives: [
        'Our baseline data shows 45% placement; target is 70% within 12 months.',
        'The program combines tutoring, mentorship, and employer placements.',
      ],
      budget: {
        total: 200000,
        admin_cost: 50000,
        program_cost: 120000,
      },
      metadata: {
        geography: 'usa',
        cycle: 'fall-2026',
      },
      attachments: [{ name: 'logic-model.pdf' }, { name: 'budget.xlsx' }],
    };

    const score = await request('/application/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        application: sampleApplication,
      }),
    });
    assert.equal(score.response.status, 200);
    assert.ok(Number.isFinite(score.body.overall_score));
    assert.ok(Array.isArray(score.body.scores_by_criterion));
    assert.ok(score.body.suggested_next_step);

    const fit = await request('/application/funder-fit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        application: sampleApplication,
      }),
    });
    assert.equal(fit.response.status, 200);
    assert.ok(['reject', 'review', 'fast-track'].includes(fit.body.recommended_band));
    assert.equal(typeof fit.body.eligibility_pass, 'boolean');

    const batch = await request('/batch/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        cycle_id: 'fall-2026',
        applications: [
          sampleApplication,
          {
            ...sampleApplication,
            id: 'app_002',
            project_summary: 'A workforce readiness project focused on digital skills and job placement in USA.',
          },
        ],
      }),
    });
    assert.equal(batch.response.status, 200);
    assert.equal(batch.body.cycle_id, 'fall-2026');
    assert.equal(batch.body.applications.length, 2);
    assert.ok(batch.body.cohort_analytics.shortlist.length >= 1);

    const cycle = await request('/cycle/intelligence', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        cycle_id: 'fall-2026',
      }),
    });
    assert.equal(cycle.response.status, 200);
    assert.ok(Array.isArray(cycle.body.intelligence.shortlist_suggestions));
    assert.ok(Array.isArray(cycle.body.intelligence.alignment_heatmap));

    const webhook = await request('/webhook/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        url: webhookUrl,
        auth: { type: 'bearer', token: 'test-token' },
        mapping: {
          move_to_committee_review: 'committee_review',
          needs_program_officer_review: 'program_officer_review',
          auto_reject_or_request_revision: 'decline_or_revise',
        },
      }),
    });
    assert.equal(webhook.response.status, 200);
    assert.equal(webhook.body.webhook.url, webhookUrl);
    assert.equal(webhook.body.test_event.mapped_stage, 'program_officer_review');

    const scoreAfterWebhook = await request('/application/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        funder_id: funderId,
        application: { ...sampleApplication, id: 'app_003' },
      }),
    });
    assert.equal(scoreAfterWebhook.response.status, 200);
    assert.equal(scoreAfterWebhook.body.webhook_delivery.configured, true);
    assert.equal(scoreAfterWebhook.body.webhook_delivery.delivered, true);
    assert.ok(webhookEvents.length >= 1);
    assert.equal(webhookEvents[0].event, 'tgm.funder-intelligence.application.score');
  } finally {
    await new Promise((resolve) => webhookReceiver.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Enterprise automation workflow', async () => {
  resetSidecarDatabase();

  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const body = await response.json();
    return { response, body };
  }

  try {
    const register = await request('/funder/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Global Impact Enterprise',
        plan_tier: 'enterprise',
        mission: 'Enterprise portfolio modernization',
        priority_areas: ['education', 'health'],
        geographies: ['usa'],
      }),
    });

    assert.equal(register.response.status, 201);
    assert.equal(register.body.plan_tier, 'enterprise');
    assert.ok(register.body.org_api_key);
    assert.ok(register.body.enterprise_config?.sso_metadata?.entity_id);
    const apiKey = register.body.org_api_key;

    const parsed = await request('/enterprise/rubric/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        format: 'csv',
        content: 'name,weight,description,scoring_scale\nImpact,40,Impact quality,0-100\nExecution,35,Execution strength,0-100\nRisk,25,Risk controls,0-100',
      }),
    });
    assert.equal(parsed.response.status, 200);
    assert.ok(parsed.body.rubric_draft_id);
    assert.equal(parsed.body.rubric_json.criteria.length, 3);

    const confirmed = await request('/enterprise/rubric/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ rubric_draft_id: parsed.body.rubric_draft_id }),
    });
    assert.equal(confirmed.response.status, 200);
    assert.equal(confirmed.body.deployed, true);

    const heartbeat = await request('/enterprise/sla/heartbeat', {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
    });
    assert.equal(heartbeat.response.status, 200);
    assert.equal(heartbeat.body.status, 'ok');

    const ticket = await request('/enterprise/support/ticket', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ subject: 'Need SSO test', description: 'Please verify IdP metadata.' }),
    });
    assert.equal(ticket.response.status, 201);
    assert.equal(ticket.body.ticket.priority, 'enterprise');

    const report = await request('/enterprise/reports/monthly', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ month: new Date().toISOString().slice(0, 7) }),
    });
    assert.equal(report.response.status, 200);
    assert.ok(report.body.report.sla_compliance);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
