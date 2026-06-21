const express = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');
const { requireFeature } = require('../middleware/tierAuth');
const {
  buildReportDocx,
  buildReportPdf,
  safeFilename,
} = require('../services/exportDocuments');

const prisma = new PrismaClient();
const router = express.Router();

const EDITOR_ROLES = ['owner', 'editor'];
const TEMPLATE_TYPES = [
  'mission_statement',
  'organizational_background',
  'program_description',
  'budget_narrative',
  'past_performance',
  'needs_statement',
];

router.use(requireAuth, requireFeature('client_folders'));

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportPayload(draft, client) {
  const content = `${draft?.title || ''}\n${draft?.content || ''}`.toLowerCase();
  const checks = [
    { key: 'mission', label: 'Clear mission alignment', terms: ['mission', 'purpose', 'community'] },
    { key: 'need', label: 'Need statement', terms: ['need', 'problem', 'challenge', 'gap'] },
    { key: 'outcomes', label: 'Measurable outcomes', terms: ['outcome', 'impact', 'measure', 'metric', 'result'] },
    { key: 'budget', label: 'Budget narrative', terms: ['budget', 'cost', 'funding', 'expense'] },
    { key: 'evidence', label: 'Evidence and validation', terms: ['data', 'evidence', 'track record', 'validated'] },
    { key: 'compliance', label: 'Compliance readiness', terms: ['eligibility', 'compliance', 'requirement', 'deadline'] },
  ];

  const present = checks.filter((check) => check.terms.some((term) => content.includes(term)));
  const missing = checks.filter((check) => !present.includes(check));
  const lengthScore = Math.min(18, Math.floor((draft?.content || '').length / 180));
  const score = Math.max(35, Math.min(98, 40 + present.length * 7 + lengthScore));
  const funders = normalizeList(client?.funders || []);

  return {
    title: `${draft?.title || 'Untitled Draft'} Checkmate Report`,
    score,
    strengths: present.length
      ? present.map((check) => check.label)
      : ['Draft has a starting structure that can be strengthened for funder review.'],
    weaknesses: missing.slice(0, 3).map((check) => `${check.label} needs stronger detail.`),
    missingComponents: missing.map((check) => check.label),
    complianceIssues: missing.some((check) => check.key === 'compliance')
      ? ['Add eligibility, deadline, and funder requirement evidence before submission.']
      : [],
    recommendedFixes: missing.map((check) => `Add a focused paragraph for: ${check.label}.`),
    funderAlignment: funders.length
      ? funders.map((funder) => `Position this proposal around ${funder} priorities.`)
      : ['Add target funders to this client folder for sharper alignment guidance.'],
  };
}

async function logActivity(clientId, userId, action, detail, metadata) {
  try {
    await prisma.clientActivityLog.create({
      data: { clientId, userId, action, detail, metadata: metadata || undefined },
    });
  } catch (error) {
    console.warn('[CLIENTS] activity log failed', error?.message || error);
  }
}

async function getAccess(clientId, user) {
  const client = await prisma.clientFolder.findUnique({ where: { id: clientId } });
  if (!client) return null;
  if (client.ownerId === user.id) return { client, role: 'owner' };

  const permission = await prisma.clientPermission.findFirst({
    where: {
      clientId,
      OR: [
        { userId: user.id },
        { email: user.email?.toLowerCase() },
      ],
    },
  });

  if (!permission) return null;
  return { client, role: permission.role || 'viewer' };
}

function canEdit(role) {
  return EDITOR_ROLES.includes(role);
}

async function requireClient(req, res, next) {
  const access = await getAccess(req.params.id, req.user);
  if (!access) return res.status(404).json({ success: false, message: 'Client folder not found' });
  req.clientAccess = access;
  return next();
}

async function requireClientEditor(req, res, next) {
  const access = await getAccess(req.params.id, req.user);
  if (!access) return res.status(404).json({ success: false, message: 'Client folder not found' });
  if (!canEdit(access.role)) return res.status(403).json({ success: false, message: 'Editor access required' });
  req.clientAccess = access;
  return next();
}

router.get('/', async (req, res) => {
  try {
    const clients = await prisma.clientFolder.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { permissions: { some: { OR: [{ userId: req.user.id }, { email: req.user.email?.toLowerCase() }] } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { drafts: true, templates: true, reports: true, documents: true, activityLogs: true } },
        permissions: true,
      },
    });
    res.json({ success: true, clients });
  } catch (error) {
    console.error('[CLIENTS] list error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, sector, state, notes, brandLogoUrl, brandColor, contactInfo } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Client name is required' });

  try {
    const client = await prisma.clientFolder.create({
      data: {
        ownerId: req.user.id,
        name: String(name).trim(),
        sector: sector || null,
        state: state || null,
        funders: normalizeList(req.body.funders),
        notes: notes || null,
        brandLogoUrl: brandLogoUrl || null,
        brandColor: brandColor || null,
        contactInfo: contactInfo || null,
      },
    });
    await logActivity(client.id, req.user.id, 'client.created', `Created client folder ${client.name}`);
    res.status(201).json({ success: true, client });
  } catch (error) {
    console.error('[CLIENTS] create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/checkmate/bulk', async (req, res) => {
  const draftIds = Array.isArray(req.body.draftIds) ? req.body.draftIds : [];
  if (!draftIds.length) return res.status(400).json({ success: false, message: 'Select at least one draft' });

  try {
    const drafts = await prisma.draft.findMany({
      where: {
        id: { in: draftIds },
        clientId: { not: null },
        OR: [
          { userId: req.user.id },
          {
            client: {
              OR: [
                { ownerId: req.user.id },
                { permissions: { some: { OR: [{ userId: req.user.id }, { email: req.user.email?.toLowerCase() }] } } },
              ],
            },
          },
        ],
      },
      include: { client: true },
    });

    const reports = [];
    for (const draft of drafts) {
      const payload = reportPayload(draft, draft.client);
      const report = await prisma.checkmateReport.create({
        data: {
          clientId: draft.clientId,
          draftId: draft.id,
          userId: req.user.id,
          ...payload,
        },
      });
      await logActivity(draft.clientId, req.user.id, 'checkmate.bulk_scored', `Scored ${draft.title}`, { draftId: draft.id, score: report.score });
      reports.push({ ...report, clientName: draft.client?.name, draftTitle: draft.title });
    }

    res.json({ success: true, reports });
  } catch (error) {
    console.error('[CLIENTS] bulk checkmate error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/checkmate/bulk/export.csv', async (req, res) => {
  const reportIds = Array.isArray(req.body.reportIds) ? req.body.reportIds : [];
  try {
    const reports = await prisma.checkmateReport.findMany({
      where: {
        ...(reportIds.length ? { id: { in: reportIds } } : {}),
        client: {
          OR: [
            { ownerId: req.user.id },
            { permissions: { some: { OR: [{ userId: req.user.id }, { email: req.user.email?.toLowerCase() }] } } },
          ],
        },
      },
      include: { client: true, draft: true },
      orderBy: { createdAt: 'desc' },
    });
    const rows = [
      ['Client', 'Draft name', 'Score', 'Issues found', 'Recommended fixes'].map(escapeCsv).join(','),
      ...reports.map((report) => [
        report.client?.name,
        report.draft?.title || report.title,
        report.score,
        [...(report.missingComponents || []), ...(report.complianceIssues || [])].join('; '),
        (report.recommendedFixes || []).join('; '),
      ].map(escapeCsv).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tgm-bulk-checkmate-results.csv"');
    res.send(rows.join('\n'));
  } catch (error) {
    console.error('[CLIENTS] bulk csv error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', requireClient, async (req, res) => {
  try {
    const client = await prisma.clientFolder.findUnique({
      where: { id: req.params.id },
      include: {
        drafts: { orderBy: { updatedAt: 'desc' } },
        templates: { orderBy: { updatedAt: 'desc' } },
        reports: { orderBy: { createdAt: 'desc' }, include: { draft: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        permissions: { orderBy: { createdAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 40 },
      },
    });
    res.json({ success: true, client, role: req.clientAccess.role, templateTypes: TEMPLATE_TYPES });
  } catch (error) {
    console.error('[CLIENTS] get error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id', requireClientEditor, async (req, res) => {
  const allowed = ['name', 'sector', 'state', 'notes', 'brandLogoUrl', 'brandColor', 'contactInfo'];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key] || null;
  }
  if (req.body.funders !== undefined) data.funders = normalizeList(req.body.funders);

  try {
    const client = await prisma.clientFolder.update({ where: { id: req.params.id }, data });
    await logActivity(client.id, req.user.id, 'client.updated', 'Updated client metadata', Object.keys(data));
    res.json({ success: true, client });
  } catch (error) {
    console.error('[CLIENTS] patch error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', requireClientEditor, async (req, res) => {
  if (req.clientAccess.client.ownerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  try {
    await prisma.clientFolder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[CLIENTS] delete error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/drafts', requireClientEditor, async (req, res) => {
  try {
    const draft = await prisma.draft.create({
      data: {
        userId: req.user.id,
        clientId: req.params.id,
        title: req.body.title || 'Untitled Client Draft',
        content: req.body.content || '',
        tierAtCreation: req.user.tier || 'free',
      },
    });
    await prisma.draftVersion.create({ data: { draftId: draft.id, content: draft.content } });
    await logActivity(req.params.id, req.user.id, 'draft.created', `Created draft ${draft.title}`, { draftId: draft.id });
    res.status(201).json({ success: true, draft });
  } catch (error) {
    console.error('[CLIENTS] draft create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/drafts/link', requireClientEditor, async (req, res) => {
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ success: false, message: 'draftId is required' });
  try {
    const draft = await prisma.draft.findFirst({ where: { id: draftId, userId: req.user.id } });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    const updated = await prisma.draft.update({ where: { id: draftId }, data: { clientId: req.params.id } });
    await logActivity(req.params.id, req.user.id, 'draft.linked', `Linked draft ${draft.title}`, { draftId });
    res.json({ success: true, draft: updated });
  } catch (error) {
    console.error('[CLIENTS] draft link error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/templates', requireClientEditor, async (req, res) => {
  const { type, title, content, isShared } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });
  try {
    const template = await prisma.clientTemplate.create({
      data: {
        clientId: req.params.id,
        userId: req.user.id,
        type: TEMPLATE_TYPES.includes(type) ? type : 'program_description',
        title,
        content,
        isShared: Boolean(isShared),
      },
    });
    await logActivity(req.params.id, req.user.id, 'template.created', `Created template ${template.title}`, { templateId: template.id });
    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('[CLIENTS] template create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/templates/sync', requireClientEditor, async (req, res) => {
  const { templateIds, targetClientIds } = req.body;
  if (!Array.isArray(templateIds) || !Array.isArray(targetClientIds)) {
    return res.status(400).json({ success: false, message: 'templateIds and targetClientIds arrays are required' });
  }

  try {
    const templates = await prisma.clientTemplate.findMany({ where: { id: { in: templateIds }, clientId: req.params.id } });
    const created = [];
    for (const targetClientId of targetClientIds) {
      const access = await getAccess(targetClientId, req.user);
      if (!access || !canEdit(access.role)) continue;
      for (const template of templates) {
        created.push(await prisma.clientTemplate.create({
          data: {
            clientId: targetClientId,
            userId: req.user.id,
            type: template.type,
            title: template.title,
            content: template.content,
            isShared: template.isShared,
          },
        }));
      }
      await logActivity(targetClientId, req.user.id, 'template.synced', `Synced ${templates.length} templates from ${req.clientAccess.client.name}`);
    }
    res.json({ success: true, templates: created });
  } catch (error) {
    console.error('[CLIENTS] template sync error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/documents', requireClientEditor, async (req, res) => {
  const { name, type, url, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Document name is required' });
  try {
    const document = await prisma.clientDocument.create({
      data: { clientId: req.params.id, userId: req.user.id, name, type: type || null, url: url || null, notes: notes || null },
    });
    await logActivity(req.params.id, req.user.id, 'document.added', `Added document ${document.name}`, { documentId: document.id });
    res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('[CLIENTS] document create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/permissions', requireClientEditor, async (req, res) => {
  if (req.clientAccess.client.ownerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  const role = ['owner', 'editor', 'viewer'].includes(req.body.role) ? req.body.role : 'viewer';
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  if (!email && !req.body.userId) return res.status(400).json({ success: false, message: 'Email or userId is required' });
  try {
    const permission = await prisma.clientPermission.create({
      data: { clientId: req.params.id, userId: req.body.userId || null, email, role },
    });
    await logActivity(req.params.id, req.user.id, 'permission.added', `Added ${role} access for ${email || req.body.userId}`);
    res.status(201).json({ success: true, permission });
  } catch (error) {
    console.error('[CLIENTS] permission create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/reports', requireClientEditor, async (req, res) => {
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ success: false, message: 'draftId is required' });
  try {
    const draft = await prisma.draft.findFirst({ where: { id: draftId, clientId: req.params.id } });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found in this client folder' });
    const payload = reportPayload(draft, req.clientAccess.client);
    const report = await prisma.checkmateReport.create({
      data: { clientId: req.params.id, draftId, userId: req.user.id, ...payload },
    });
    await logActivity(req.params.id, req.user.id, 'checkmate.scored', `Scored ${draft.title}`, { draftId, score: report.score });
    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('[CLIENTS] report create error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id/reports/:reportId/export', requireClient, async (req, res) => {
  try {
    const report = await prisma.checkmateReport.findFirst({
      where: { id: req.params.reportId, clientId: req.params.id },
      include: { client: true, draft: true },
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const brandColor = report.client.brandColor || '#003A8C';
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;margin:40px;line-height:1.5}
.header{border-bottom:4px solid ${escapeHtml(brandColor)};padding-bottom:18px;margin-bottom:28px}
.logo{max-height:56px;margin-bottom:12px}.score{font-size:44px;color:${escapeHtml(brandColor)};font-weight:800}
h1,h2{color:${escapeHtml(brandColor)}}li{margin-bottom:6px}.meta{color:#64748b;font-size:13px}
</style></head><body>
<div class="header">
${report.client.brandLogoUrl ? `<img class="logo" src="${escapeHtml(report.client.brandLogoUrl)}" alt="">` : ''}
<h1>${escapeHtml(report.client.name)} Checkmate Report</h1>
<p class="meta">${escapeHtml(report.client.contactInfo || 'Prepared in The Grants Master')}</p>
</div>
<p class="meta">Draft: ${escapeHtml(report.draft?.title || report.title)}</p>
<div class="score">${report.score}/100</div>
${['strengths','weaknesses','missingComponents','complianceIssues','recommendedFixes','funderAlignment'].map((key) => `
<h2>${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}</h2>
<ul>${(report[key] || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`).join('')}
</body></html>`;

    await logActivity(req.params.id, req.user.id, 'report.exported', `Exported ${report.title}`, { reportId: report.id, format: 'html' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.client.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-checkmate-report.html"`);
    res.send(html);
  } catch (error) {
    console.error('[CLIENTS] report export error', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id/reports/:reportId/export.pdf', requireClient, async (req, res) => {
  try {
    const report = await prisma.checkmateReport.findFirst({
      where: { id: req.params.reportId, clientId: req.params.id },
      include: { client: true, draft: true },
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const buffer = await buildReportPdf({ report, client: report.client });
    await logActivity(req.params.id, req.user.id, 'report.exported', `Exported ${report.title}`, { reportId: report.id, format: 'pdf' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(`${report.client?.name || 'client'}-${report.title}`)}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('[CLIENTS] report pdf export error', error?.message || error);
    res.status(500).json({ success: false, message: 'PDF export failed' });
  }
});

router.get('/:id/reports/:reportId/export.docx', requireClient, async (req, res) => {
  try {
    const report = await prisma.checkmateReport.findFirst({
      where: { id: req.params.reportId, clientId: req.params.id },
      include: { client: true, draft: true },
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const buffer = await buildReportDocx({ report, client: report.client });
    await logActivity(req.params.id, req.user.id, 'report.exported', `Exported ${report.title}`, { reportId: report.id, format: 'docx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(`${report.client?.name || 'client'}-${report.title}`)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('[CLIENTS] report docx export error', error?.message || error);
    res.status(500).json({ success: false, message: 'DOCX export failed' });
  }
});

module.exports = router;
