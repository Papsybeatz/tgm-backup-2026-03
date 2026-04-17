
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import prisma from "../db/prismaClient.js";
import { requireAuth } from "../middleware/roleAuth.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      activeClientId: true
    }
  });
  res.json({ user });
});



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

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.body.token;
  if (!token) return res.status(400).json({ success: false, message: 'Missing token.' });
  await prisma.session.deleteMany({ where: { token } });
  res.json({ success: true });
});



// GET /api/auth/diagnostics/prisma
router.get('/diagnostics/prisma', async (req, res) => {
  const result = await prismaEngineIntegrity({ root: process.cwd() });
  res.json(result);
});

// GET /api/auth/diagnostics/prisma-migrations
router.get('/diagnostics/prisma-migrations', async (req, res) => {
  const result = await prismaMigrationSafety({ root: process.cwd() });
  res.json(result);
});

export default router;
