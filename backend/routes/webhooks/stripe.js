const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendBrevoEmail } = require('../../utils/brevo');
const FUNDER_PILOT_PRICE_ID = process.env.STRIPE_FUNDER_PILOT_PRICE_ID || 'price_1TxLdP64TrQMI3mIwohgkoSa';
const FUNDER_SCALE_PRICE_ID = process.env.STRIPE_FUNDER_SCALE_PRICE_ID || 'price_1TxLku64TrQMI3mIiFBlby8P';
const FUNDER_ENTERPRISE_PRICE_ID = process.env.STRIPE_FUNDER_ENTERPRISE_PRICE_ID || 'price_1TxLrO64TrQMI3mIKMEbGAvL';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('REPLACE')) return null;
  try { return require('stripe')(key); }
  catch (e) { console.warn('[STRIPE WEBHOOK] stripe SDK not available:', e.message); return null; }
}

function getPriceTierMap() {
  return {
    [process.env.STRIPE_STARTER_PRICE_ID]:          'starter',
    [process.env.STRIPE_PRO_PRICE_ID]:              'pro',
    [process.env.STRIPE_ANNUAL_PRO_PRICE_ID]:       'pro',
    [process.env.STRIPE_AGENCY_STARTER_PRICE_ID]:   'agency_starter',
    [process.env.STRIPE_AGENCY_UNLIMITED_PRICE_ID]: 'agency_unlimited',
    [process.env.STRIPE_LIFETIME_PRICE_ID]:         'lifetime',
    [FUNDER_PILOT_PRICE_ID]:                        'funder_pilot',
    [FUNDER_SCALE_PRICE_ID]:                        'funder_scale',
    [FUNDER_ENTERPRISE_PRICE_ID]:                   'funder_enterprise',
  };
}

function clean(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function logStripeEvent(event, userId, message) {
  try {
    await prisma.errorLog.create({
      data: {
        message: `${event.type}: ${message}`,
        endpoint: 'stripe-webhook',
        userId: userId || null,
        severity: 'info',
      },
    });
  } catch (error) {
    console.warn('[STRIPE WEBHOOK] could not log event:', error.message);
  }
}

async function findUser({ userId, customerId, email }) {
  if (userId) {
    const byId = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (byId) return byId;
  }
  if (customerId) {
    const byCustomer = await prisma.user.findFirst({ where: { stripeCustomerId: String(customerId) } });
    if (byCustomer) return byCustomer;
  }
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email: String(email) } });
    if (byEmail) return byEmail;
  }
  return null;
}

async function applyStripeAccess({ event, user, tier, subscriptionStatus, subscriptionType, subscriptionId, stripeCustomerId, currentPeriodEnd }) {
  if (!user) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: clean({
      tier,
      subscriptionStatus,
      subscriptionType,
      subscriptionId,
      stripeCustomerId,
      currentPeriodEnd,
      provider: 'stripe',
    }),
  });
  await logStripeEvent(event, updated.id, `tier=${updated.tier} status=${updated.subscriptionStatus}`);
  return updated;
}

async function getSubscriptionDetails(stripe, subscriptionId) {
  if (!subscriptionId) return { currentPeriodEnd: null, priceId: null, status: null, customerId: null };
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  return {
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    priceId: sub.items?.data?.[0]?.price?.id || null,
    status: sub.status || null,
    customerId: sub.customer || null,
  };
}

// ---------------------------------------------------------------------------
// Funder cycle activation — called from checkout.session.completed
// ---------------------------------------------------------------------------

async function activateFunderCycle(session) {
  const meta = session.metadata || {};
  const funderLeadId = meta.funder_lead_id;
  const funderCycleId = meta.funder_cycle_id;
  const cycleName = meta.cycle_name;
  const cycleYear = Number(meta.cycle_year);
  const planKey = meta.plan_key || 'funder_scale';
  const applicationsAllowed = Number(meta.applications_allowed) || 50;
  const paymentIntentId = session.payment_intent || null;
  const stripeCustomerId = session.customer || null;

  if (!funderLeadId || !funderCycleId) {
    console.error('[STRIPE WEBHOOK] funder_cycle: missing lead/cycle IDs in metadata', meta);
    return;
  }

  // Load the lead
  const lead = await prisma.funderLead.findUnique({ where: { id: funderLeadId } });
  if (!lead) {
    console.error('[STRIPE WEBHOOK] funder_cycle: lead not found', funderLeadId);
    return;
  }

  // Provision funder on sidecar if not already done
  let sidecarFunderId = lead.sidecarFunderId;
  let orgApiKey = lead.orgApiKey;

  const sidecarBase = process.env.FUNDER_INTELLIGENCE_BASE_URL;
  const internalSecret = process.env.FUNDER_INTELLIGENCE_INTERNAL_SECRET;

  if (sidecarBase && internalSecret && !sidecarFunderId) {
    try {
      const provRes = await fetch(`${sidecarBase}/internal/funders/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({
          name: lead.name,
          orgName: lead.orgName,
          email: lead.email,
          planTier: planKey.replace('funder_', ''),
          keyScope: 'production',
        }),
      });
      const provData = await provRes.json();
      if (provRes.ok && provData.funder_id) {
        sidecarFunderId = provData.funder_id;
        orgApiKey = provData.api_key;
        console.log('[STRIPE WEBHOOK] funder_cycle: sidecar provisioned', sidecarFunderId);
      } else {
        console.error('[STRIPE WEBHOOK] funder_cycle: sidecar provision failed', provData);
      }
    } catch (err) {
      console.error('[STRIPE WEBHOOK] funder_cycle: sidecar provision error', err.message);
    }
  }

  // Activate cycle entitlement on sidecar
  const sidecarCycleId = `${funderCycleId}`;
  if (sidecarBase && internalSecret && sidecarFunderId) {
    try {
      const actRes = await fetch(`${sidecarBase}/internal/cycles/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({
          funderId: sidecarFunderId,
          cycleId: sidecarCycleId,
          planKey,
          applicationsAllowed,
          stripePaymentIntentId: paymentIntentId,
        }),
      });
      if (!actRes.ok) {
        const actData = await actRes.json();
        console.error('[STRIPE WEBHOOK] funder_cycle: cycle activation failed', actData);
      }
    } catch (err) {
      console.error('[STRIPE WEBHOOK] funder_cycle: cycle activation error', err.message);
    }
  }

  const now = new Date();

  // Update Prisma: FunderLead + FunderCycle
  await prisma.funderLead.update({
    where: { id: funderLeadId },
    data: {
      status: 'production_active',
      sidecarFunderId: sidecarFunderId || lead.sidecarFunderId,
      orgApiKey: orgApiKey || lead.orgApiKey,
    },
  });

  await prisma.funderCycle.update({
    where: { id: funderCycleId },
    data: {
      status: 'active',
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId: stripeCustomerId,
      sidecarCycleId,
      activatedAt: now,
    },
  });

  console.log('[STRIPE WEBHOOK] funder_cycle: activated', { funderLeadId, funderCycleId, cycleName, cycleYear });

  // Send credentials email to funder
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && orgApiKey) {
    const docsUrl = 'https://github.com/Papsybeatz/tgm-backup-2026-03/blob/main/docs/funder-intelligence-api.md';
    const curlExample = `curl -X POST ${sidecarBase || 'https://your-sidecar-url'}/application/score \\
  -H "x-api-key: ${orgApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"funder_id":"${sidecarFunderId}","cycle_id":"${sidecarCycleId}","application":{"id":"app_001","project_summary":"..."}}'`;

    sendBrevoEmail({
      to: lead.email,
      toName: lead.name,
      subject: `TGM Funder Intelligence API — ${cycleName} ${cycleYear} Activated`,
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1A;line-height:1.6;">
          <h2>Your cycle is live — Funder Intelligence API</h2>
          <p>Hi ${lead.name},</p>
          <p>Payment confirmed. Your <strong>${cycleName} ${cycleYear}</strong> cycle is now active for <strong>${lead.orgName}</strong>.</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:4px 8px;font-weight:bold;">API Key</td><td style="padding:4px 8px;font-family:monospace;">${orgApiKey}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold;">Funder ID</td><td style="padding:4px 8px;font-family:monospace;">${sidecarFunderId}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold;">Cycle ID</td><td style="padding:4px 8px;font-family:monospace;">${sidecarCycleId}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold;">Applications</td><td style="padding:4px 8px;">${applicationsAllowed} included</td></tr>
          </table>
          <p><strong>Quick start:</strong></p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-size:12px;overflow:auto;">${curlExample}</pre>
          <p><a href="${docsUrl}">Full API documentation →</a></p>
          <p>— TGM Team</p>
        </div>
      `,
    }).then((r) => { if (!r.sent) console.error('[STRIPE WEBHOOK] funder_cycle: creds email failed', r.error); });

    // Admin alert
    const adminEmail = process.env.ADMIN_EMAIL || process.env.FOUNDER_EMAIL || process.env.CONTACT_TO_EMAIL;
    if (adminEmail) {
      sendBrevoEmail({
        to: adminEmail,
        toName: 'TGM Admin',
        subject: `[TGM] Funder cycle activated: ${lead.orgName} / ${cycleName} ${cycleYear}`,
        htmlContent: `<p>${lead.name} (${lead.email}) — ${lead.orgName}<br>Cycle: ${cycleName} ${cycleYear}<br>Plan: ${planKey}<br>Apps allowed: ${applicationsAllowed}<br>Funder ID: ${sidecarFunderId}<br>Cycle ID: ${sidecarCycleId}</p>`,
      }).catch(() => {});
    }
  }
}

async function handleStripeEvent(req, res) {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[STRIPE WEBHOOK] STRIPE_SECRET_KEY not set');
    return res.status(500).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.warn('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  try {
    const PRICE_TIER_MAP = getPriceTierMap();
    const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Funder cycle checkout — separate from user subscription flow
        if (session.metadata?.checkout_context === 'funder_cycle') {
          await activateFunderCycle(session);
          return res.status(200).send('ok');
        }

        const priceId = session.metadata?.price_id || null;
        const tier = PRICE_TIER_MAP[priceId] || null;
        const subscriptionId = session.subscription || null;
        const customerId = session.customer || null;
        const email = session.customer_details?.email || session.customer_email || null;
        const user = await findUser({ userId: session.metadata?.user_id, customerId, email });

        if (!user) { await logStripeEvent(event, null, 'no matching user'); return res.status(200).send('no user'); }
        if (!tier) { await logStripeEvent(event, user.id, `unknown price ${priceId}`); return res.status(200).send('unknown price'); }

        const isLifetime = priceId === LIFETIME_PRICE_ID;
        let currentPeriodEnd = null;
        let subscriptionStatus = 'active';
        if (subscriptionId && !isLifetime) {
          const details = await getSubscriptionDetails(stripe, subscriptionId);
          currentPeriodEnd = details.currentPeriodEnd;
          subscriptionStatus = details.status || 'active';
        }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus,
          subscriptionType: isLifetime ? 'one_time' : 'recurring',
          subscriptionId,
          stripeCustomerId: customerId,
          currentPeriodEnd,
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const tier = PRICE_TIER_MAP[priceId] || null;
        const user = await findUser({ userId: sub.metadata?.user_id, customerId: sub.customer });
        if (!user) { await logStripeEvent(event, null, `no matching user for ${sub.id}`); return res.status(200).send('no user'); }
        if (!tier) { await logStripeEvent(event, user.id, `unknown price ${priceId}`); return res.status(200).send('unknown price'); }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus: sub.status,
          subscriptionType: 'recurring',
          subscriptionId: sub.id,
          stripeCustomerId: sub.customer,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        });
        return res.status(200).send('ok');
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription || null;
        if (!subscriptionId) return res.status(200).send('no subscription');
        const details = await getSubscriptionDetails(stripe, subscriptionId);
        const tier = PRICE_TIER_MAP[details.priceId] || undefined;
        const user = await findUser({ customerId: details.customerId });
        if (!user) { await logStripeEvent(event, null, `no user for ${subscriptionId}`); return res.status(200).send('no user'); }

        await applyStripeAccess({
          event,
          user,
          tier,
          subscriptionStatus: 'active',
          subscriptionType: 'recurring',
          subscriptionId,
          stripeCustomerId: details.customerId,
          currentPeriodEnd: details.currentPeriodEnd,
        });
        return res.status(200).send('ok');
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = await findUser({ customerId: sub.customer });
        if (!user) return res.status(200).send('no user');
        await applyStripeAccess({
          event,
          user,
          tier: 'free',
          subscriptionStatus: 'canceled',
          subscriptionType: 'none',
          subscriptionId: null,
          stripeCustomerId: sub.customer,
          currentPeriodEnd: null,
        });
        return res.status(200).send('ok');
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = await findUser({ customerId: invoice.customer });
        if (!user) return res.status(200).send('no user');
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'past_due', provider: 'stripe' },
        });
        await logStripeEvent(event, user.id, 'payment failed');
        return res.status(200).send('ok');
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const user = await findUser({ customerId: charge.customer });
        if (!user) return res.status(200).send('no user');
        await applyStripeAccess({
          event,
          user,
          tier: 'free',
          subscriptionStatus: 'refunded',
          subscriptionType: 'none',
          subscriptionId: null,
          stripeCustomerId: charge.customer,
          currentPeriodEnd: null,
        });
        return res.status(200).send('ok');
      }

      default:
        await logStripeEvent(event, null, 'ignored');
        return res.status(200).send('ignored');
    }
  } catch (err) {
    console.error('[STRIPE WEBHOOK] handler error:', err);
    return res.status(500).send('handler error');
  }
}

const rawJson = express.raw({ type: 'application/json' });
router.post('/stripe-webhook', rawJson, handleStripeEvent);
router.post('/webhook', rawJson, handleStripeEvent);

module.exports = router;
