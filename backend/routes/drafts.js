// backend/routes/drafts.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

const requireAuth = require('../middleware/auth');

console.log('[DRAFTS ROUTE] loaded from file:', __filename);

// POST /api/drafts — create a new draft for the authenticated user
router.post('/', requireAuth, async (req, res) => {
  console.log('[DRAFTS] CREATE (auth)', { user: req.user && { id: req.user.id, email: req.user.email }, bodySample: req.body && { title: req.body.title } });
  const { title, content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: 'Missing content.' });
  try {
    const draft = await prisma.draft.create({
      data: { userId: req.user.id, title: title || '', content, tierAtCreation: req.user.tier || 'free' },
    });
    // versioning snapshot
    try { await prisma.draftVersion.create({ data: { draftId: draft.id, content: draft.content } }); } catch (e) { console.warn('[DRAFTS] versioning create error', e && e.message ? e.message : e); }
    return res.json({ success: true, draft });
  } catch (e) {
    console.error('[DRAFTS] create error', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/drafts/:id — update (autosave) draft owned by authenticated user
router.patch('/:id', requireAuth, async (req, res) => {
  const draftId = req.params.id;
  const { title, content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: 'Missing content.' });
  try {
    const existing = await prisma.draft.findFirst({ where: { id: draftId, userId: req.user.id } });
    if (!existing) return res.status(403).json({ success: false, message: 'Forbidden' });
    const draft = await prisma.draft.update({ where: { id: draftId }, data: { title, content, updatedAt: new Date() } });
    // versioning snapshot
    try { await prisma.draftVersion.create({ data: { draftId: draft.id, content: draft.content } }); } catch (e) { console.warn('[DRAFTS] versioning update error', e && e.message ? e.message : e); }
    return res.json({ success: true, draft });
  } catch (e) {
    console.error('[DRAFTS] patch error', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/drafts?email=...  — returns drafts for authenticated user or by email
// GET /api/drafts — list drafts for authenticated user
router.get('/', requireAuth, async (req, res) => {
  console.log('[DRAFTS] LIST (auth)', { user: req.user && { id: req.user.id, email: req.user.email } });
  try {
    const drafts = await prisma.draft.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' } });
    console.log('[DRAFTS] list -> found', drafts.length);
    return res.json({ success: true, drafts });
  } catch (e) {
    console.error('[DRAFTS] list error', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/drafts/:id — get single draft for authenticated user
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const draftId = req.params.id;
    const draft = await prisma.draft.findFirst({ where: { id: draftId, userId: req.user.id } });
    if (!draft) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, draft });
  } catch (e) {
    console.error('[DRAFTS] get error', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Draft versions endpoints
// GET /api/drafts/:id/versions
router.get('/:id/versions', requireAuth, async (req, res) => {
  try {
    const draftId = req.params.id;
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft || draft.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    const versions = await prisma.draftVersion.findMany({ where: { draftId }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, versions });
  } catch (e) {
    console.error('[DRAFTS] versions list error', e && e.message ? e.message : e);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/drafts/:id/versions — create a new version for a draft
router.post('/:id/versions', requireAuth, async (req, res) => {
  try {
    const draftId = req.params.id;
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Missing content for version.' });
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft || draft.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    const version = await prisma.draftVersion.create({ data: { draftId, content } });
    return res.json({ success: true, version });
  } catch (e) {
    console.error('[DRAFTS] create version error', e && e.message ? e.message : e);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/drafts/:id/versions/:versionId/restore — restore a draft from a version
router.post('/:id/versions/:versionId/restore', requireAuth, async (req, res) => {
  try {
    const draftId = req.params.id;
    const versionId = req.params.versionId;
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft || draft.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    const version = await prisma.draftVersion.findUnique({ where: { id: versionId } });
    if (!version || version.draftId !== draftId) return res.status(404).json({ success: false, message: 'Version not found' });

    // Save current content as a version before restoring
    try {
      await prisma.draftVersion.create({ data: { draftId, content: draft.content } });
    } catch (e) {
      console.warn('[DRAFTS] failed to snapshot current content before restore', e && e.message ? e.message : e);
    }

    const updated = await prisma.draft.update({ where: { id: draftId }, data: { content: version.content, updatedAt: new Date() } });
    return res.json({ success: true, draft: updated });
  } catch (e) {
    console.error('[DRAFTS] restore error', e && e.message ? e.message : e);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

