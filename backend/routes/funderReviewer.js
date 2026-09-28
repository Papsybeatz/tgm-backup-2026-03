/**
 * Reviewer mode — server-side proxy to the funder intelligence API.
 *
 * The sidecar authenticates with an `x-api-key` header carrying a funder's org
 * API key. That key must never reach a browser, so the UI cannot call the
 * sidecar directly. This route sits in front of it:
 *
 *   browser -> POST /api/funder/reviewer/worklist -> sidecar /reviewer/worklist
 *
 * The key is taken from the request if the caller supplies one (an org
 * operating its own key), otherwise from
 * FUNDER_INTELLIGENCE_REVIEWER_KEY — a platform key created in the sidecar.
 *
 * Nothing here scores anything. The sidecar owns the engines; this only moves
 * the request and keeps the credential server-side.
 */
const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const requireAuth = require('../middleware/auth');
const { errorDetail } = require('../utils/errorDetail');

const router = express.Router();

const MAX_APPLICATIONS = 500;
const TIMEOUT_MS = 60000;

function sidecarBase() {
  return String(process.env.FUNDER_INTELLIGENCE_BASE_URL || '').replace(/\/+$/, '');
}

/** POST JSON to the sidecar and return its parsed body. */
function postToSidecar(pathname, payload, apiKey) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(`${sidecarBase()}${pathname}`);
    } catch {
      return reject(new Error('FUNDER_INTELLIGENCE_BASE_URL is not configured'));
    }

    const body = JSON.stringify(payload);
    const transport = target.protocol === 'http:' ? http : https;

    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'http:' ? 80 : 443),
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c.toString(); });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = { raw: data.slice(0, 500) };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );

    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Funder API timed out')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Reviewer seats are a tier feature of the funder plan; the sidecar reports them. */
router.post('/reviewer/worklist', requireAuth, async (req, res) => {
  const apiKey =
    String(req.header('x-funder-key') || '').trim() ||
    String(process.env.FUNDER_INTELLIGENCE_REVIEWER_KEY || '').trim();

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'reviewer_not_configured',
      message: 'Reviewer mode is not configured. Set FUNDER_INTELLIGENCE_REVIEWER_KEY on the backend service.',
    });
  }

  if (!sidecarBase()) {
    return res.status(503).json({
      success: false,
      error: 'sidecar_not_configured',
      message: 'FUNDER_INTELLIGENCE_BASE_URL is not configured on the backend service.',
    });
  }

  const applications = Array.isArray(req.body?.applications) ? req.body.applications : [];
  if (!applications.length) {
    return res.status(400).json({ success: false, message: 'Provide a cohort: an `applications` array.' });
  }
  if (applications.length > MAX_APPLICATIONS) {
    return res.status(400).json({
      success: false,
      message: `Too many applications (${applications.length}). The limit is ${MAX_APPLICATIONS} per cohort.`,
    });
  }

  try {
    const { status, body } = await postToSidecar(
      '/reviewer/worklist',
      {
        ...req.body,
        applications,
        reviewer_scores: Array.isArray(req.body?.reviewer_scores) ? req.body.reviewer_scores : [],
      },
      apiKey,
    );

    if (status < 200 || status >= 300) {
      // Pass the sidecar's own words through: a 401 here usually means the org
      // key is wrong, and a 403 means the key has no access to that funder.
      return res.status(status).json({
        success: false,
        message: body?.message || 'The funder API rejected the request.',
        detail: errorDetail(body),
      });
    }

    return res.json({ success: true, ...body });
  } catch (error) {
    console.error('[REVIEWER] proxy failed:', error?.message || error);
    return res.status(502).json({
      success: false,
      message: 'Could not reach the funder intelligence API.',
      detail: errorDetail(error),
    });
  }
});

/** Is reviewer mode usable at all? Lets the UI explain itself instead of failing. */
router.get('/reviewer/status', requireAuth, (req, res) => {
  res.json({
    success: true,
    configured: Boolean(sidecarBase() && (req.header('x-funder-key') || process.env.FUNDER_INTELLIGENCE_REVIEWER_KEY)),
    hasSidecarUrl: Boolean(sidecarBase()),
    hasKey: Boolean(req.header('x-funder-key') || process.env.FUNDER_INTELLIGENCE_REVIEWER_KEY),
  });
});

module.exports = router;
