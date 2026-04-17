
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware/roleAuth');
const User = require('../models/User');

const SIGNING_SECRET = process.env.LEMONSQUEEZY_SIGNING_SECRET;

function verifySignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

router.post('/lemon-webhook', requireAuth, express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature'];
  const rawBody = req.body.toString();

  // Logging for dev
  console.log('[WEBHOOK] Raw payload:', rawBody);
  console.log('[WEBHOOK] X-Signature:', signature);
  const computed = crypto.createHmac('sha256', SIGNING_SECRET).update(rawBody).digest('hex');
  console.log('[WEBHOOK] Computed signature:', computed);

  const isValid = verifySignature(rawBody, signature, SIGNING_SECRET);
  console.log('[WEBHOOK] Signature valid:', isValid);

  if (!isValid) {
    console.warn('[WEBHOOK] Signature verification failed');
    return res.status(403).send('Invalid signature');
  }

  const data = JSON.parse(rawBody);
  console.log('[WEBHOOK] Parsed payload:', data);

  const event = data.event_name;
  const customerEmail = data.data?.customer_email;
  const customerId = data.data?.customer_id;

  console.log(`[WEBHOOK] Event: ${event}`);
  console.log(`[WEBHOOK] Customer Email: ${customerEmail}`);
  console.log(`[WEBHOOK] Customer ID: ${customerId}`);

  // ...existing business logic...
  if (event === 'order_created' || event === 'subscription_created') {
    // Detect product and tier
    const productId = data.data?.product_id;
    // Replace with your actual product IDs from LemonSqueezy
    const PRO_PRODUCT_ID = 'PRO_PRODUCT_ID';
    const AGENCY_STARTER_ID = 'AGENCY_STARTER_ID';
    const AGENCY_UNLIMITED_ID = 'AGENCY_UNLIMITED_ID';
    let newTier = 'starter';
    let updateFields = {};
    if (productId === PRO_PRODUCT_ID) {
      newTier = 'pro';
      updateFields = { proActivatedAt: new Date() };
      console.log(`[WEBHOOK] Unlocking Pro tier for ${customerEmail || customerId}`);
    } else if (productId === AGENCY_STARTER_ID) {
      newTier = 'agency_starter';
      updateFields = {
        agencyActivatedAt: new Date(),
        maxSeats: 10,
        maxWorkspaces: 5
      };
      console.log(`🎉 Unlocking Agency Starter tier for ${customerEmail || customerId}`);
    } else if (productId === AGENCY_UNLIMITED_ID) {
      newTier = 'agency_unlimited';
      updateFields = {
        agencyActivatedAt: new Date(),
        maxSeats: Infinity,
        maxWorkspaces: Infinity
      };
      console.log(`🎉 Unlocking Agency Unlimited tier for ${customerEmail || customerId}`);
    } else {
      console.log(`🎉 Unlocking Starter tier for ${customerEmail || customerId}`);
    }

    // Try to update by email first
    if (customerEmail) {
      User.findOneAndUpdate(
        { email: customerEmail },
        { tier: newTier, ...updateFields },
        { new: true },
        (err, updatedUser) => {
          if (err) {
            console.error('❌ DB update failed (email):', err);
            return res.status(500).send('DB error');
          }
          if (updatedUser) {
            console.log(`✅ User upgraded to ${newTier}:`, updatedUser.email);
            return res.status(200).send('Webhook processed');
          } else if (customerId) {
            // Fallback: try by LemonSqueezy customerId
            User.findOneAndUpdate(
              { lemonCustomerId: customerId },
              { tier: newTier, ...updateFields },
              { new: true },
              (err2, updatedUser2) => {
                if (err2) {
                  console.error('❌ DB update failed (customerId):', err2);
                  return res.status(500).send('DB error');
                }
                if (updatedUser2) {
                  console.log(`✅ User upgraded to ${newTier} by customerId:`, updatedUser2.email || updatedUser2.lemonCustomerId);
                  return res.status(200).send('Webhook processed');
                } else {
                  console.warn('❌ No user found for email or customerId');
                  return res.status(404).send('User not found');
                }
              }
            );
          } else {
            console.warn('❌ No user found for email, and no customerId provided');
            return res.status(404).send('User not found');
          }
        }
      );
    } else if (customerId) {
      // No email, try by customerId only
      User.findOneAndUpdate(
        { lemonCustomerId: customerId },
        { tier: newTier, ...updateFields },
        { new: true },
        (err, updatedUser) => {
          if (err) {
            console.error('❌ DB update failed (customerId):', err);
            return res.status(500).send('DB error');
          }
          if (updatedUser) {
            console.log(`✅ User upgraded to ${newTier} by customerId:`, updatedUser.email || updatedUser.lemonCustomerId);
            return res.status(200).send('Webhook processed');
          } else {
            console.warn('❌ No user found for customerId');
            return res.status(404).send('User not found');
          }
        }
      );
    } else {
      console.warn('❌ No customerEmail or customerId provided');
      return res.status(400).send('Missing customer info');
    }
    return; // prevent further response
  }

  console.log('ℹ️ Unhandled event type:', event);
  res.status(200).send('Event ignored');
});

module.exports = router;
