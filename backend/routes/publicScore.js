/**
 * POST /api/public/score — anonymous Checkmate scoring.
 * ----------------------------------------------------------------------------
 * The funnel wedge. A visitor uploads a proposal and gets the same Checkmate
 * rubric the paid product uses, with no account and no credit card.
 *
 * Three rules this route exists to honour:
 *
 * 1. The diagnosis is free, the fixes are not. `applyScoreGate('free', …)`
 *    withholds the recommended fixes and sets `fixesLocked`. That is the
 *    Model A rule the pricing page sells, so it is enforced here, on the
 *    server — not in the browser.
 *
 * 2. The document is never stored. A consultant uploading a client's proposal
 *    is handing over confidential material. The file is held in memory, written
 *    to an OS temp path only because `extractDocumentText` reads from disk, and
 *    deleted on every exit path. Nothing is written to the served upload
 *    directory and nothing is persisted to the database.
 *
 * 3. The score is real. `orderless: true` selects the document-only rubric, so
 *    a strong draft is not marked down for ticket fields an anonymous upload
 *    was never asked to supply.
 *
 * Abuse control lives in the mount (see server.js): a per-minute limiter for
 * hot loops and a per-day limiter that mirrors the Free tier's score cap.
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const { scoreDraft } = require('../agents/steve/scoring');
const { applyScoreGate, FREE_SCORE_LIMIT } = require('../utils/scoreGate');
const { extractDocumentText } = require('../utils/extractDocumentText');
const { errorDetail } = require('../utils/errorDetail');

const router = express.Router();
const prisma = new PrismaClient();

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, matching /api/documents/upload
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];
const MIN_READABLE_CHARS = 200;

// Memory storage on purpose: no destination, so there is no served directory
// and no filename an attacker can guess. See rule 2 above.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) return cb(null, true);
    return cb(
      new Error(
        `We can't read ${ext || 'that'} files. Upload a PDF, Word document, or plain text file.`,
      ),
    );
  },
});

/** Turn multer's errors into a clean 400 instead of a 500. */
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'That file is larger than 10MB. Try exporting just the narrative.'
        : error.message || 'Upload failed. Please try again.';
    return res.status(400).json({ success: false, error: 'upload_rejected', message });
  });
}

/**
 * Extract text from an in-memory upload.
 *
 * `extractDocumentText` reads from a path, so the buffer is spooled to a temp
 * file and removed in `finally` — including when extraction throws. The temp
 * path is random, outside the app tree, and never logged.
 */
async function readUploadedText(file) {
  const tmpPath = path.join(
    os.tmpdir(),
    `tgm-score-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`,
  );
  try {
    fs.writeFileSync(tmpPath, file.buffer);
    return await extractDocumentText(tmpPath);
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch (error) {
      // Already gone is fine; anything else is worth knowing about but must not
      // fail the request, because the caller's score is unaffected.
      if (error?.code !== 'ENOENT') {
        console.warn('[PUBLIC SCORE] temp cleanup failed:', error?.code || error?.message);
      }
    }
  }
}

router.post('/score', handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'no_file',
      message: 'Attach a proposal file to score.',
    });
  }

  let content = '';
  try {
    content = await readUploadedText(req.file);
  } catch (error) {
    console.warn('[PUBLIC SCORE] extraction failed:', error?.message || error);
    content = '';
  }

  const text = String(content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < MIN_READABLE_CHARS) {
    return res.status(400).json({
      success: false,
      error: 'unreadable',
      message:
        "We couldn't read enough text from that file. Scanned PDFs have no text layer — upload a Word version, or a PDF exported from the original document.",
    });
  }

  try {
    const report = await scoreDraft({}, content, { orderless: true });

    // Diagnosis free, fixes paid — the same gate the signed-in route applies.
    const gated = applyScoreGate('free', report);

    // Anonymous funnel telemetry. userId stays null; the action names the
    // surface. A ledger failure must never cost the visitor their score.
    try {
      await prisma.aiLog.create({ data: { userId: null, action: 'public_score' } });
    } catch (error) {
      console.warn('[PUBLIC SCORE] could not record usage:', error?.message || error);
    }

    return res.json({
      success: true,
      score: gated.score,
      label: gated.label,
      criteria: gated.criteria,
      criteriaDefs: gated.criteriaDefs,
      strengths: gated.strengths || [],
      weaknesses: gated.weaknesses || [],
      missingComponents: gated.missingComponents || [],
      fixesLocked: gated.fixesLocked,
      // The evidence floor caps a tidy-but-unverifiable draft. Sent to the client
      // so the page can explain WHY a well-formatted document scored low —
      // otherwise a capped score reads as a broken tool.
      evidenceFloorApplied: Boolean(gated.evidenceFloorApplied),
      style: gated.style,
      // Echoed so the page can label the result; never used as a stored key.
      fileName: req.file.originalname,
      words: text.split(/\s+/).length,
      anonymousLimit: FREE_SCORE_LIMIT,
      signupUrl: '/signup?from=public-score',
      stored: false,
    });
  } catch (error) {
    console.error('[PUBLIC SCORE] failed:', error?.message || error);
    return res.status(500).json({
      detail: errorDetail(error),
      success: false,
      message: 'Scoring failed. Please try again.',
    });
  }
});

module.exports = router;
