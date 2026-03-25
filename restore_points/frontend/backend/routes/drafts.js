// backend/routes/drafts.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// POST /api/drafts/save
router.post('/save', async (req, res) => {
  const { id, email, title, content } = req.body;
  if (!email || !content) return res.status(400).json({ success: false, message: 'Missing email or content.' });
  let draft;
  if (id) {
    draft = await prisma.draft.update({
      where: { id },
      data: { title, content, updatedAt: new Date() },
    });
  } else {
    draft = await prisma.draft.create({
      data: {
        userEmail: email,
        title: title || '',
        content,
        tierAtCreation: 'free', // Optionally set from user tier
      },
    });
  }
  res.json(draft);
});

module.exports = router;
