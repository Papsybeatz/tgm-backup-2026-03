const express = require('express');
const https = require('https');
const router = express.Router();
const requireAuth = require('../middleware/auth');

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY || '';

// GET /api/billing/portal
// Returns the LemonSqueezy customer portal URL for the authenticated user.
// The user is redirected there to manage/cancel their subscription themselves.
router.get('/portal', requireAuth, async (req, res) => {
  try {
    const user = req.user;

    // Free users have no subscription to manage
    if (!user.lemonCustomerId && user.tier === 'free') {
      return res.json({
        success: false,
        message: 'No active subscription to manage.',
        upgradeUrl: `${process.env.APP_URL || 'https://www.thegrantsmaster.com'}/pricing`,
      });
    }

    // If we have a LemonSqueezy customer ID, fetch their portal URL via LS API
    if (user.lemonCustomerId && LS_API_KEY) {
      const portalUrl = await getLemonPortalUrl(user.lemonCustomerId);
      if (portalUrl) {
        return res.json({ success: true, url: portalUrl });
      }
    }

    // Fallback: direct them to LemonSqueezy's generic customer portal
    // Users can find their subscription by email
    return res.json({
      success: true,
      url: 'https://app.lemonsqueezy.com/my-orders',
      fallback: true,
    });
  } catch (e) {
    console.error('[BILLING] portal error', e.message);
    res.status(500).json({ success: false, message: 'Could not load billing portal.' });
  }
});

function getLemonPortalUrl(customerId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.lemonsqueezy.com',
      path: `/v1/customers/${customerId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${LS_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          const portalUrl = json?.data?.attributes?.urls?.customer_portal;
          resolve(portalUrl || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

module.exports = router;
