/**
 * The Checkmate score card — the share loop.
 * ----------------------------------------------------------------------------
 * A score is a status object. Consultants who score well want to show it; the
 * ones who score badly want the fix. Without a card to post, the funnel is a
 * dead end: a visitor gets a number and leaves.
 *
 * Two rules shape everything here:
 *
 *   1. The client's file name never reaches the card. A consultant sharing a
 *      score must not leak which client the draft belongs to. The stem is
 *      masked; only the extension survives, which is a format, not an identity.
 *   2. Nothing leaves the browser. The card is drawn on a local canvas and
 *      handed to the OS share sheet or downloaded. No upload, no server render,
 *      no analytics on the document. Same promise as the score itself.
 *
 * The text model is split from the drawing so the redaction and the copy can be
 * tested without a canvas.
 */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** Where a shared card points people. */
export const SHARE_URL = 'https://www.thegrantsmaster.com/checkup';

const NAVY = '#0A0F1A';
const BLUE = '#003A8C';
const GOLD = '#D4AF37';
const GOLD_LIGHT = '#E8D28C';
const SUCCESS = '#22C55E';
const WARNING = '#F59E0B';

/**
 * Mask a file name down to its extension.
 *
 * Never echoes any part of the stem — "client-acme-2026-rehab.pdf" and
 * "acme.pdf" must both come back indistinguishable. The extension is kept
 * because it is a format, not an identity.
 */
export function redactFileName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const dot = trimmed.lastIndexOf('.');
  const hasExt = dot > 0 && dot < trimmed.length - 1 && dot >= trimmed.length - 8;
  const ext = hasExt ? trimmed.slice(dot) : '';
  return `\u2022\u2022\u2022\u2022\u2022\u2022${ext}`;
}

/** LinkedIn only accepts a URL for off-site sharing; the image rides along. */
export function linkedInShareUrl(url = SHARE_URL) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function bandColorFor(score) {
  if (score >= 85) return SUCCESS;
  if (score >= 70) return BLUE;
  if (score >= 55) return WARNING;
  return '#EF4444';
}

/**
 * The card's text model. Everything the card draws comes from here, so the
 * redaction guarantee is testable: `file` must never contain the raw name.
 */
export function scoreCardContent(report = {}) {
  const raw = Number(report.score);
  const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;

  const defs = Array.isArray(report.criteriaDefs) && report.criteriaDefs.length
    ? report.criteriaDefs
    : Object.keys(report.criteria || {}).map((key) => ({ key, label: key }));

  const criteria = defs.slice(0, 6).map((def) => ({
    key: def.key,
    label: def.label,
    value: Math.max(0, Math.min(100, Math.round(Number(report.criteria?.[def.key]) || 0))),
  }));

  return {
    eyebrow: 'CHECKMATE SCORE',
    score,
    scoreSuffix: '/100',
    band: report.label || '',
    bandColor: bandColorFor(score),
    file: redactFileName(report.fileName),
    words: Number.isFinite(Number(report.words)) ? Number(report.words) : null,
    floor: report.evidenceFloorApplied === true,
    criteria,
    footer: 'thegrantsmaster.com/checkup',
    cta: 'Score your own draft \u2014 free, no signup',
  };
}

/** The caption that accompanies the post. Never includes the file name. */
export function shareCaption(report = {}) {
  const { score, band } = scoreCardContent(report);
  const tail = band ? ` (${band})` : '';
  return `My grant proposal scored ${score}/100${tail} on Checkmate. Free to check yours before you submit.`;
}

/* ── drawing ──────────────────────────────────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw the card onto a 2D context. Kept separate from canvas creation so the
 * caller owns sizing and so this stays free of DOM access.
 */
export function drawScoreCard(ctx, report = {}) {
  const c = scoreCardContent(report);
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, BLUE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // gold rule along the top
  const rule = ctx.createLinearGradient(0, 0, W, 0);
  rule.addColorStop(0, GOLD);
  rule.addColorStop(1, GOLD_LIGHT);
  ctx.fillStyle = rule;
  ctx.fillRect(0, 0, W, 6);

  const PAD = 64;

  // brand mark
  ctx.fillStyle = GOLD;
  roundRect(ctx, PAD, PAD, 44, 44, 12);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.font = 'bold 17px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('GM', PAD + 11, PAD + 23);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 23px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('GrantsMaster', PAD + 58, PAD + 23);

  // eyebrow
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = 'bold 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(c.eyebrow, PAD, 190);

  // the score
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 150px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const scoreText = String(c.score);
  ctx.fillText(scoreText, PAD, 330);
  const scoreWidth = ctx.measureText(scoreText).width;

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 30px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(c.scoreSuffix, PAD + scoreWidth + 12, 330);

  // band pill
  if (c.band) {
    ctx.font = 'bold 17px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    const tw = ctx.measureText(c.band).width;
    const pw = tw + 34;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, PAD, 356, pw, 40, 20);
    ctx.fill();
    ctx.fillStyle = c.bandColor;
    roundRect(ctx, PAD, 356, 5, 40, 3);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.band, PAD + 20, 377);
    ctx.textBaseline = 'alphabetic';
  }

  // evidence-floor note. States the finding, never a cap: the floor triggers on
  // any draft with weak evidence, including ones already scoring below the cap.
  if (c.floor) {
    ctx.fillStyle = WARNING;
    ctx.font = 'bold 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('No verifiable evidence found', PAD, 432);
  }

  // criteria bars (right column)
  const BX = 660;
  const BW = W - BX - PAD;
  let by = 186;
  for (const crit of c.criteria) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(crit.label, BX, by);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    const vw = ctx.measureText(String(crit.value)).width;
    ctx.fillText(String(crit.value), BX + BW - vw, by);

    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, BX, by + 10, BW, 9, 4.5);
    ctx.fill();

    ctx.fillStyle = bandColorFor(crit.value);
    roundRect(ctx, BX, by + 10, Math.max(6, (BW * crit.value) / 100), 9, 4.5);
    ctx.fill();

    by += 58;
  }

  // footer
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 520);
  ctx.lineTo(W - PAD, 520);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.font = '15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const meta = [c.file, c.words ? `${c.words.toLocaleString()} words` : null]
    .filter(Boolean)
    .join('  \u00b7  ');
  if (meta) ctx.fillText(meta, PAD, 556);

  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = 'bold 16px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(c.cta, PAD, 588);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = 'bold 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const fw = ctx.measureText(c.footer).width;
  ctx.fillText(c.footer, W - PAD - fw, 588);

  return c;
}

/** Draw the card and return a PNG blob. Browser-only; null anywhere else. */
export async function renderScoreCardBlob(report = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawScoreCard(ctx, report);

  if (typeof canvas.toBlob !== 'function') return null;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), 'image/png');
  });
}

export const CARD_FILENAME = 'checkmate-score.png';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The one-click share.
 *
 * Prefers the native share sheet (mobile, and desktop where supported) because
 * it puts the image straight into the post. Falls back to downloading the card
 * and opening LinkedIn's composer, since LinkedIn's off-site share accepts a
 * URL only — the user attaches the downloaded image.
 *
 * Returns the mode used so the caller can tell the visitor what happened.
 */
export async function shareScoreCard(report = {}) {
  const blob = await renderScoreCardBlob(report);
  const caption = shareCaption(report);

  if (blob && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], CARD_FILENAME, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Checkmate score', text: caption });
        return { mode: 'native', blob };
      }
    } catch (error) {
      // A cancelled share sheet lands here too — fall through to the download path.
    }
  }

  if (blob && typeof document !== 'undefined') {
    downloadBlob(blob, CARD_FILENAME);
  }
  if (typeof window !== 'undefined') {
    window.open(linkedInShareUrl(), '_blank', 'noopener,noreferrer');
  }
  return { mode: 'download+linkedin', blob };
}
