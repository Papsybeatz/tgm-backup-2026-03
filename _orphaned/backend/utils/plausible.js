// backend/utils/plausible.js
const https = require('https');

let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000;

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.PLAUSIBLE_API_KEY;
    const req = https.request(url, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function getPlausibleStats() {
  const now = Date.now();

  if (cache && now - cacheTime < CACHE_DURATION) {
    return cache;
  }

  const siteId = process.env.PLAUSIBLE_SITE_ID;
  const apiKey = process.env.PLAUSIBLE_API_KEY;

  if (!siteId || !apiKey) {
    console.warn('[PLAUSIBLE] Missing PLAUSIBLE_SITE_ID or PLAUSIBLE_API_KEY');
    return cache || { visitors24h: 0, visitors7d: 0, visitors30d: 0, pageviews30d: 0, timeseries: [] };
  }

  try {
    const [aggRes, timeseriesRes] = await Promise.all([
      fetchJSON(`https://plausible.io/api/v1/stats/aggregate?site_id=${siteId}&period=custom&dateFrom=${formatDate(30)}&dateTo=${formatDate(0)}&metrics=visitors,pageviews`),
      fetchJSON(`https://plausible.io/api/v1/stats/timeseries?site_id=${siteId}&period=custom&dateFrom=${formatDate(30)}&dateTo=${formatDate(0)}&metrics=visitors`)
    ]);

    const data = {
      visitors24h: aggRes.results?.visitors?.value || 0,
      visitors7d: 0,
      visitors30d: aggRes.results?.visitors?.value || 0,
      pageviews30d: aggRes.results?.pageviews?.value || 0,
      timeseries: (timeseriesRes.results || []).map(r => ({
        date: r.date,
        visitors: r.visitors,
        pageviews: r.pageviews
      }))
    };

    cache = data;
    cacheTime = now;
    return data;
  } catch (err) {
    console.error('[PLAUSIBLE] Fetch error:', err.message);
    return cache || { visitors24h: 0, visitors7d: 0, visitors30d: 0, pageviews30d: 0, timeseries: [] };
  }
}

function formatDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function clearPlausibleCache() {
  cache = null;
  cacheTime = 0;
}

module.exports = { getPlausibleStats, clearPlausibleCache };