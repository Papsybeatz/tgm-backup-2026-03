/**
 * POST /api/lead-magnet/submit
 *
 * Accepts { name, email, source } and forwards the contact to Brevo.
 * Adds the contact to the configured list and triggers the TGM Warm Nurture
 * automation if a list ID is set.
 *
 * Environment variables required:
 *   BREVO_API_KEY      — Brevo (Sendinblue) API key
 *   BREVO_LIST_ID      — Numeric list ID for lead magnet subscribers
 *
 * This file is a Vite/Express API handler. If you are using a different
 * server framework, adapt the req/res interface accordingly.
 */

import type { Request, Response } from 'express';

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts';

interface SubmitBody {
  name:   string;
  email:  string;
  source?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, source = 'grant-workflow-blueprint' } = req.body as SubmitBody;

  // Validate
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const apiKey  = process.env.BREVO_API_KEY;
  const listId  = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : null;

  if (!apiKey) {
    // Dev fallback — log and succeed without hitting Brevo
    console.warn('[lead-magnet/submit] BREVO_API_KEY not set — skipping Brevo call');
    console.log(`[lead-magnet/submit] Would have submitted: name="${name}" email="${email}" source="${source}"`);
    return res.status(200).json({ success: true, dev: true });
  }

  // Split name into first/last for Brevo attributes
  const nameParts  = name.trim().split(/\s+/);
  const firstName  = nameParts[0] ?? '';
  const lastName   = nameParts.slice(1).join(' ') || '';

  const brevoPayload: Record<string, unknown> = {
    email:      email.trim().toLowerCase(),
    attributes: {
      FIRSTNAME:    firstName,
      LASTNAME:     lastName,
      LEAD_SOURCE:  source,
    },
    updateEnabled: true,   // update if contact already exists
  };

  if (listId) {
    brevoPayload.listIds = [listId];
  }

  try {
    const brevoRes = await fetch(BREVO_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':       apiKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    // 201 = created, 204 = updated (contact already existed)
    if (brevoRes.status === 201 || brevoRes.status === 204) {
      return res.status(200).json({ success: true });
    }

    const errorBody = await brevoRes.json().catch(() => ({}));
    console.error('[lead-magnet/submit] Brevo error:', brevoRes.status, errorBody);

    // Brevo 400 with "Contact already exist" is not a real error for us
    if (brevoRes.status === 400 && (errorBody as any)?.code === 'duplicate_parameter') {
      return res.status(200).json({ success: true });
    }

    return res.status(502).json({ error: 'Failed to subscribe. Please try again.' });

  } catch (err) {
    console.error('[lead-magnet/submit] Network error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
