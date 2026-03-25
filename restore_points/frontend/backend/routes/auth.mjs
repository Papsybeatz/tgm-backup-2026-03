import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateSessionToken, getSessionExpiry } from '../utils/session.mjs';
import { sanitizeInput, validateEmail } from '../utils/sanitize.js';

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
  // Set cookie for entire domain
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/", // IMPORTANT: allow for all routes
    // secure: true, // Uncomment if using HTTPS
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.json({ token, email: user.email, tier: user.tier });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "No session token" });

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    res.json({
      email: session.user.email,
      tier: session.user.tier,
      userId: session.user.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
