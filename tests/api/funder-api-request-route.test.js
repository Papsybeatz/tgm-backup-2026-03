const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const funderApiRequestRoute = require('../../backend/routes/funderApiRequest');

function makeResponse(status, body) {
  return {
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}

function startApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/funder-api', funderApiRequestRoute);
  return app.listen(0);
}

function sendJson(server, path, payload) {
  const address = server.address();
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: raw ? JSON.parse(raw) : {},
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

test('funder API request intake automation', async (t) => {
  const originalFetch = global.fetch;
  const originalEnv = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_FROM_EMAIL: process.env.BREVO_FROM_EMAIL,
    BREVO_FROM_NAME: process.env.BREVO_FROM_NAME,
    FUNDER_INTELLIGENCE_BASE_URL: process.env.FUNDER_INTELLIGENCE_BASE_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    FOUNDER_EMAIL: process.env.FOUNDER_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    await t.test('auto-provisions a real funder key when sidecar URL is configured', async () => {
      process.env.BREVO_API_KEY = 'brevo-test-key';
      process.env.BREVO_FROM_EMAIL = 'support@thegrantsmaster.com';
      process.env.BREVO_FROM_NAME = 'The Grants Master';
      process.env.FUNDER_INTELLIGENCE_BASE_URL = 'https://sidecar.example';
      process.env.ADMIN_EMAIL = 'owner@example.com';
      process.env.NODE_ENV = 'production';

      const calls = [];
      global.fetch = async (url, options) => {
        const parsedBody = options && options.body ? JSON.parse(options.body) : null;
        calls.push({ url, options, body: parsedBody });

        if (url === 'https://sidecar.example/funder/register') {
          return makeResponse(201, {
            funder_id: 'funder_123',
            api_key: 'tgm_fi_live_123',
            plan_tier: 'scale',
            validation_report: { valid: true },
          });
        }
        if (url === 'https://api.brevo.com/v3/contacts') {
          return makeResponse(201, { id: 1 });
        }
        if (url === 'https://api.brevo.com/v3/smtp/email') {
          return makeResponse(201, { messageId: 'msg_1' });
        }

        throw new Error('Unexpected fetch URL: ' + url);
      };

      const server = startApp();
      try {
        const result = await sendJson(server, '/api/funder-api/request-key', {
          name: 'Ada Lovelace',
          org: 'Impact First Foundation',
          email: 'ada@impact.org',
          role: 'Program Director',
          message: 'We want scoring and funder-fit automation for our fall cycle.',
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.autoProvisioned, true);
        assert.equal(result.body.onboardingPacketSent, true);
        assert.equal(result.body.adminAlertSent, true);
        assert.equal(result.body.warning, null);

        const registerCall = calls.find((call) => call.url === 'https://sidecar.example/funder/register');
        assert.ok(registerCall);
        assert.equal(registerCall.body.name, 'Impact First Foundation');
        assert.equal(registerCall.body.plan_tier, 'scale');

        const contactCall = calls.find((call) => call.url === 'https://api.brevo.com/v3/contacts');
        assert.ok(contactCall);
        assert.equal(contactCall.body.email, 'ada@impact.org');

        const smtpCalls = calls.filter((call) => call.url === 'https://api.brevo.com/v3/smtp/email');
        assert.equal(smtpCalls.length, 2);

        const funderEmail = smtpCalls.find((call) => call.body.to[0].email === 'ada@impact.org');
        const adminEmail = smtpCalls.find((call) => call.body.to[0].email === 'owner@example.com');

        assert.ok(funderEmail);
        assert.ok(adminEmail);
        assert.match(funderEmail.body.subject, /key is ready/);
        assert.match(funderEmail.body.htmlContent, /tgm_fi_live_123/);
        assert.match(funderEmail.body.htmlContent, /funder_123/);

        assert.match(adminEmail.body.subject, /Impact First Foundation/);
        assert.match(adminEmail.body.htmlContent, /Auto-provisioned/);
        assert.match(adminEmail.body.htmlContent, /tgm_fi_live_123/);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    await t.test('falls back to manual follow-up when sidecar URL is missing', async () => {
      process.env.BREVO_API_KEY = 'brevo-test-key';
      process.env.BREVO_FROM_EMAIL = 'support@thegrantsmaster.com';
      process.env.BREVO_FROM_NAME = 'The Grants Master';
      process.env.ADMIN_EMAIL = 'owner@example.com';
      process.env.NODE_ENV = 'production';
      delete process.env.FUNDER_INTELLIGENCE_BASE_URL;

      const calls = [];
      global.fetch = async (url, options) => {
        const parsedBody = options && options.body ? JSON.parse(options.body) : null;
        calls.push({ url, options, body: parsedBody });

        if (url === 'https://api.brevo.com/v3/contacts') {
          return makeResponse(201, { id: 1 });
        }
        if (url === 'https://api.brevo.com/v3/smtp/email') {
          return makeResponse(201, { messageId: 'msg_2' });
        }

        throw new Error('Unexpected fetch URL: ' + url);
      };

      const server = startApp();
      try {
        const result = await sendJson(server, '/api/funder-api/request-key', {
          name: 'Grace Hopper',
          org: 'Signal Fund',
          email: 'grace@signal.org',
          role: 'Head of Grants',
          message: 'Need pilot access.',
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.autoProvisioned, false);
        assert.equal(result.body.onboardingPacketSent, true);
        assert.equal(result.body.adminAlertSent, true);
        assert.match(result.body.warning, /Admin follow-up/);

        const registerCall = calls.find((call) => /\/funder\/register$/.test(call.url));
        assert.equal(registerCall, undefined);

        const smtpCalls = calls.filter((call) => call.url === 'https://api.brevo.com/v3/smtp/email');
        assert.equal(smtpCalls.length, 2);
        const funderEmail = smtpCalls.find((call) => call.body.to[0].email === 'grace@signal.org');
        assert.ok(funderEmail);
        assert.match(funderEmail.body.subject, /request is received/);
        assert.match(funderEmail.body.htmlContent, /Final API key issuance is still pending/);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  } finally {
    global.fetch = originalFetch;
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  }
});