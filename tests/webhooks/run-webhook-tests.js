#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

function runScript(relPath) {
  const full = path.join(process.cwd(), relPath);
  console.log('\n---- Running', relPath, '----');
  const res = spawnSync(process.execPath, [full], { stdio: 'inherit', env: process.env });
  return res.status;
}

const tests = [
  'tests/webhooks/lemon_webhook_test.js',
  'tests/webhooks/stripe_webhook_test.js'
];

let failed = false;
for (const t of tests) {
  const code = runScript(t);
  if (code !== 0) {
    console.error('[RUNNER] Test failed:', t, 'exit', code);
    failed = true;
    break;
  }
}

if (failed) process.exit(2);
console.log('\nAll webhook tests passed');
