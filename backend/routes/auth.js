// backend/routes/auth.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateSessionToken, getSessionExpiry } = require('../utils/session');
const { sanitizeInput, validateEmail } = require('../utils/sanitize');

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = sanitizeInput(req.body.email);
  if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email.' });
  let user = await prisma.user.findUnique({ where: { email } });
  const now = new Date();
  if (!user) {
    const randomPass = require('crypto').randomBytes(16).toString('hex');
    user = await prisma.user.create({
      data: {
        email,
        password: randomPass,
        tier: 'free'
      },
    });
  } else {
    // touch the user to update `updatedAt`
    await prisma.user.update({ where: { email }, data: { tier: user.tier } });
    user = await prisma.user.findUnique({ where: { email } });
  }
  // Generate session token
  const token = generateSessionToken();
  const expiresAt = getSessionExpiry();
  await prisma.session.create({
    data: {
      token,
      email,
      createdAt: now,
      expiresAt: new Date(expiresAt),
    },
  });
  // Set HTTP-only secure cookie for browser clients
  try {
    const maxAge = new Date(expiresAt).getTime() - Date.now();
    res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge });
  } catch (e) {
    // ignore cookie set errors
  }
  res.json({ token, email: user.email, tier: user.tier, createdAt: user.createdAt, updatedAt: user.updatedAt });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.body.token;
  if (!token) return res.status(400).json({ success: false, message: 'Missing token.' });
  await prisma.session.deleteMany({ where: { token } });
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  // Accept Bearer token or HTTP-only cookie named 'session'
  let token = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '');
  if (!token && req.cookies && req.cookies.session) token = req.cookies.session;
  if (!token) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
  const user = await prisma.user.findUnique({ where: { email: session.email } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ email: user.email, tier: user.tier, createdAt: user.createdAt, updatedAt: user.updatedAt });
});

module.exports = router;
