const BACKEND_URL = process.env.BACKEND_API_URL || 'https://tgm-backup-2026-03-production-ea59.up.railway.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (error) {
    console.error('[CONTACT PROXY] request failed:', error);
    return res.status(502).json({ success: false, message: 'Contact service is unavailable.' });
  }
}
