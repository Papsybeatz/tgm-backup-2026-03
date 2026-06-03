/**
 * POST /api/lead-magnet/submit
 *
 * Accepts { name, email, source } and creates/updates a contact in Brevo.
 * Adds the contact to BREVO_LIST_ID if set, triggering the TGM Warm Nurture automation.
 *
 * Environment variables:
 *   BREVO_API_KEY   — Brevo API key (required for live submissions)
 *   BREVO_LIST_ID   — Numeric Brevo list ID for lead magnet subscribers
 */

const express = require('express');
const router  = express.Router();

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/submit', async (req, res) => {
  const { name, email, source = 'grant-workflow-blueprint' } = req.body || {};

  // Validate
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : null;

  // Dev fallback — succeed without hitting Brevo if key not set
  if (!apiKey) {
    console.warn('[lead-magnet/submit] BREVO_API_KEY not set — skipping Brevo call');
    console.log(`[lead-magnet/submit] name="${name}" email="${email}" source="${source}"`);
    return res.status(200).json({ success: true, dev: true });
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || '';

  const payload = {
    email:         email.trim().toLowerCase(),
    attributes:    { FIRSTNAME: firstName, LASTNAME: lastName, LEAD_SOURCE: source },
    updateEnabled: true,
  };
  if (listId) payload.listIds = [listId];

  try {
    const brevoRes = await fetch(BREVO_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body:    JSON.stringify(payload),
    });

    // 201 created, 204 updated — both are success
    if (brevoRes.status === 201 || brevoRes.status === 204) {
      return res.status(200).json({ success: true });
    }

    const errorBody = await brevoRes.json().catch(() => ({}));

    // Brevo returns 400 with code "duplicate_parameter" when contact already exists
    // and updateEnabled didn't trigger — treat as success
    if (brevoRes.status === 400 && errorBody?.code === 'duplicate_parameter') {
      return res.status(200).json({ success: true });
    }

    console.error('[lead-magnet/submit] Brevo error:', brevoRes.status, errorBody);
    return res.status(502).json({ error: 'Failed to subscribe. Please try again.' });

  } catch (err) {
    console.error('[lead-magnet/submit] Network error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
