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
    user = await prisma.user.create({
      data: {
        email,
        tier: 'free',
        createdAt: now,
        lastLogin: now,
      },
    });
  } else {
    await prisma.user.update({ where: { email }, data: { lastLogin: now } });
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
  res.json({ token, email: user.email, tier: user.tier });
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
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
  const token = auth.replace('Bearer ', '');
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session expired.' });
  const user = await prisma.user.findUnique({ where: { email: session.email } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ email: user.email, tier: user.tier, createdAt: user.createdAt, lastLogin: user.lastLogin });
});

module.exports = router;
