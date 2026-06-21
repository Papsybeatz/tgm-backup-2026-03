const PDFDocument = require('pdfkit');
const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = require('docx');

function safeFilename(value, fallback = 'tgm-export') {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [String(value)];
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function pdfBuffer(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'LETTER' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    doc.end();
  });
}

function addPdfSection(doc, title, items, color = '#003A8C') {
  doc.moveDown(0.8).fontSize(14).fillColor(color).font('Helvetica-Bold').text(title);
  const list = normalizeList(items);
  if (!list.length) {
    doc.moveDown(0.2).fontSize(10).fillColor('#475569').font('Helvetica').text('No items flagged.');
    return;
  }
  list.forEach((item) => {
    doc.moveDown(0.25).fontSize(10).fillColor('#111827').font('Helvetica').text(`- ${item}`, { indent: 12 });
  });
}

async function buildDraftPdf({ title, content, subtitle }) {
  return pdfBuffer((doc) => {
    doc.fontSize(20).fillColor('#003A8C').font('Helvetica-Bold').text(title || 'Untitled Draft');
    if (subtitle) doc.moveDown(0.2).fontSize(10).fillColor('#64748B').font('Helvetica').text(subtitle);
    doc.moveDown(1).fontSize(11).fillColor('#111827').font('Helvetica').text(stripHtml(content), {
      lineGap: 4,
      align: 'left',
    });
  });
}

async function buildReportPdf({ report, client }) {
  const color = client?.brandColor || '#003A8C';
  return pdfBuffer((doc) => {
    doc.fontSize(11).fillColor('#64748B').font('Helvetica-Bold').text(client?.name || 'Client Report');
    if (client?.contactInfo) doc.moveDown(0.1).fontSize(9).fillColor('#64748B').font('Helvetica').text(client.contactInfo);
    doc.moveDown(0.7).fontSize(22).fillColor(color).font('Helvetica-Bold').text(report.title || 'Checkmate Report');
    doc.moveDown(0.4).fontSize(42).fillColor(color).font('Helvetica-Bold').text(`${report.score}/100`);
    doc.fontSize(10).fillColor('#64748B').font('Helvetica').text('Funding readiness score');

    addPdfSection(doc, 'Strengths', report.strengths, color);
    addPdfSection(doc, 'Weaknesses', report.weaknesses, color);
    addPdfSection(doc, 'Missing Components', report.missingComponents, color);
    addPdfSection(doc, 'Compliance Issues', report.complianceIssues, color);
    addPdfSection(doc, 'Recommended Fixes', report.recommendedFixes, color);
    addPdfSection(doc, 'Funder Alignment', report.funderAlignment, color);
  });
}

function paragraph(text, options = {}) {
  return new Paragraph({
    heading: options.heading,
    alignment: options.alignment,
    spacing: { after: options.after ?? 160 },
    children: [
      new TextRun({
        text: String(text || ''),
        bold: Boolean(options.bold),
        size: options.size || 22,
      }),
    ],
  });
}

function listParagraph(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text: String(text), size: 21 })],
  });
}

async function buildDraftDocx({ title, content, subtitle }) {
  const children = [
    paragraph(title || 'Untitled Draft', { heading: HeadingLevel.TITLE, bold: true, size: 34 }),
  ];
  if (subtitle) children.push(paragraph(subtitle, { size: 20 }));
  stripHtml(content).split(/\n{2,}/).filter(Boolean).forEach((block) => {
    children.push(paragraph(block.trim(), { size: 22 }));
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function addDocxSection(children, title, items) {
  children.push(paragraph(title, { heading: HeadingLevel.HEADING_2, bold: true, size: 26 }));
  const list = normalizeList(items);
  if (!list.length) {
    children.push(paragraph('No items flagged.', { size: 21 }));
    return;
  }
  list.forEach((item) => children.push(listParagraph(item)));
}

async function buildReportDocx({ report, client }) {
  const children = [
    paragraph(client?.name || 'Client Report', { bold: true, size: 22 }),
    paragraph(report.title || 'Checkmate Report', { heading: HeadingLevel.TITLE, bold: true, size: 34 }),
    paragraph(`${report.score}/100 Funding Readiness Score`, { alignment: AlignmentType.CENTER, bold: true, size: 30 }),
  ];
  if (client?.contactInfo) children.push(paragraph(client.contactInfo, { size: 20 }));

  addDocxSection(children, 'Strengths', report.strengths);
  addDocxSection(children, 'Weaknesses', report.weaknesses);
  addDocxSection(children, 'Missing Components', report.missingComponents);
  addDocxSection(children, 'Compliance Issues', report.complianceIssues);
  addDocxSection(children, 'Recommended Fixes', report.recommendedFixes);
  addDocxSection(children, 'Funder Alignment', report.funderAlignment);

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = {
  buildDraftDocx,
  buildDraftPdf,
  buildReportDocx,
  buildReportPdf,
  safeFilename,
  stripHtml,
};
