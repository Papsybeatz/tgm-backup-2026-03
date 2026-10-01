const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { errorDetail } = require('../utils/errorDetail');

const router = express.Router();
const prisma = new PrismaClient();

// A quote short enough to be a pull-quote and long enough to be a real one.
const MIN_QUOTE = 40;
const MAX_QUOTE = 600;
const MAX_FIELD = 120;

function clean(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * GET /api/testimonials
 *
 * Public. Approved rows only, and never the submitter's email — the whole point
 * of an anonymous testimonial is that the identity stays out of the payload as
 * well as off the page. Returns an empty list rather than 404 when there is
 * nothing to show, so the UI can render nothing instead of an error.
 */
router.get('/', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        id: true,
        quote: true,
        role: true,
        orgType: true,
        region: true,
        createdAt: true,
      },
    });
    res.json({ success: true, testimonials });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Could not load testimonials.',
      detail: errorDetail(err),
    });
  }
});

/**
 * POST /api/testimonials
 *
 * Public submission. Always lands as 'pending' — there is no path by which a
 * request body can publish itself. Moderation is the admin route, not a flag
 * a client can set.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const quote = clean(body.quote, MAX_QUOTE);

    if (!quote || quote.length < MIN_QUOTE) {
      return res.status(400).json({
        success: false,
        message: `Tell us a little more — at least ${MIN_QUOTE} characters.`,
      });
    }

    const row = await prisma.testimonial.create({
      data: {
        quote,
        role: clean(body.role, MAX_FIELD),
        orgType: clean(body.orgType, MAX_FIELD),
        region: clean(body.region, MAX_FIELD),
        email: clean(body.email, MAX_FIELD),
        status: 'pending',
        source: 'website',
      },
      select: { id: true },
    });

    res.json({
      success: true,
      id: row.id,
      message:
        'Thank you — we read every one. If we publish yours it will be anonymous unless you tell us otherwise.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Could not save that right now.',
      detail: errorDetail(err),
    });
  }
});

module.exports = router;
