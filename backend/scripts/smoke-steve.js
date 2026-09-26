#!/usr/bin/env node
/**
 * Steve concierge — post-deploy smoke test
 * ----------------------------------------------------------------------------
 * Drives the REAL deployed API through a complete grant order and asserts the
 * whole pipeline works. Safe to run against production: it uses a throwaway
 * session key and does not touch any existing user's data.
 *
 * Usage:
 *   node scripts/smoke-steve.js
 *   STEVE_BASE_URL=https://your-service.up.railway.app node scripts/smoke-steve.js
 *
 * Exit code 0 = pass, 1 = fail. Prints one line per check.
 */

const BASE = (process.env.STEVE_BASE_URL || 'https://www.thegrantsmaster.com').replace(/\/+$/, '');
const SESSION = `smoke_${Date.now()}`;

/** Canned answers keyed by order-ticket slot. */
const ANSWERS = {
  applicant_name: 'Hope Orphanage',
  applicant_type: '501(c)(3) nonprofit',
  need_statement: 'Thirty orphaned children aged 4-15 in Roanoke lack stable housing and school access.',
  program_activities: 'Fund school fees, meals and a supervised dormitory.',
  target_population: 'Orphaned children aged 4 to 15',
  people_served: '30',
  service_area: 'Roanoke, Virginia',
  address: '4210 Electric Road #1038, Roanoke, VA 24018',
  request_amount: '$75,000',
  outcomes: 'Serve 30 children with 95% school enrollment and full daily meal coverage.',
  timeline: 'January to December 2027',
  funder_name: 'The Community Foundation',
  budget_breakdown: 'School fees $30,000; meals $25,000; dormitory $20,000',
  evidence: 'Served 60 children since 2021 with a 92% school retention rate.',
  contact_name: 'Grace Mensah, Director',
  deadline: 'March 15',
  style: 'full_proposal',
  project_title: 'Hope Orphanage Residential Support Program',
  funder_guidelines: '',
};

let failures = 0;

function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  if (!ok) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON (${res.status}): ${text.slice(0, 160)}`);
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nSteve concierge smoke test → ${BASE}\n`);

  // Note: the public domain only proxies /api/* (see vercel.json), so probe the
  // API surface rather than /health when testing through www.
  const reachable = await fetch(`${BASE}/api/assistant/session?userId=${SESSION}`)
    .then(async (r) => ({ ok: r.ok, body: await r.text() }))
    .catch(() => null);
  check('API is reachable', Boolean(reachable?.ok), reachable ? `HTTP ${reachable.ok ? 200 : 'error'}` : 'no response');

  await post('/api/assistant/reset', { userId: SESSION }).catch(() => null);

  const first = await post('/api/assistant', {
    userId: SESSION,
    message: 'A client of mine started an orphanage with 30 orphans and needs a grant written.',
  });

  check('first turn succeeds', first.status === 200, `HTTP ${first.status}`);
  check('asks a question instead of guessing', String(first.json.reply || '').includes('?'));
  check('returns an order ticket', Boolean(first.json.progress?.lines?.length), `${first.json.progress?.requiredTotal ?? 0} required lines`);
  check('reports its engine', Boolean(first.json.engine), `engine=${first.json.engine}`);

  // Walk the ticket: answer whichever required line is still blank.
  let turn = first.json;
  for (let i = 0; i < 25; i += 1) {
    const next = (turn.progress?.lines || []).find((line) => line.required && !line.filled);
    if (!next) break;
    if (!ANSWERS[next.key] && ANSWERS[next.key] !== '') {
      console.log(`  [WARN] no canned answer for "${next.key}" — stopping walk`);
      break;
    }
    turn = (
      await post('/api/assistant', { userId: SESSION, message: ANSWERS[next.key] })
    ).json;
  }

  check('order ticket completes', turn.progress?.complete === true, `${turn.progress?.requiredFilled ?? 0}/${turn.progress?.requiredTotal ?? 0}`);
  check('reads the order back before writing', /write it|shall i|ready to write/i.test(String(turn.reply || '')));

  const done = await post('/api/assistant', { userId: SESSION, message: 'yes' });
  const report = done.json.scoreReport;

  check('writes the grant', done.json.hasDraft === true);
  check('status is ready_for_review', done.json.status === 'ready_for_review', String(done.json.status));
  check('Checkmate returns a real score', typeof done.json.score === 'number' && done.json.score > 0 && done.json.score <= 100, `score=${done.json.score}`);
  check('Checkmate includes criteria', Boolean(report?.criteria), report?.label || '');
  check('Checkmate recommends fixes', Array.isArray(report?.fixes) && report.fixes.length > 0, `${report?.fixes?.length ?? 0} fixes`);

  let session = null;
  try {
    session = await fetch(`${BASE}/api/assistant/session?userId=${SESSION}`).then((r) => r.json());
  } catch {
    session = null;
  }
  check('session rehydrates', Array.isArray(session?.messages) && session.messages.length > 0, `${session?.messages?.length ?? 0} messages`);
  check('draft survives a reload', session?.hasDraft === true, session?.draftTitle || '');

  console.log(
    failures === 0
      ? '\nAll checks passed — the concierge is live and working.\n'
      : `\n${failures} check(s) FAILED. If the service is still running the old keyword router, deploy the steve-agent-phase1 branch and re-run.\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\nSmoke test crashed: ${error.message}\n`);
  process.exit(1);
});
