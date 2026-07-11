const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParseModule = require('pdf-parse');
const WordExtractor = require('word-extractor');

const pdfParse = pdfParseModule.default || pdfParseModule;

function normalizeText(value = '') {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractDocumentText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    return normalizeText(fs.readFileSync(filePath, 'utf8'));
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return normalizeText(result.value);
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return normalizeText(result.text);
  }

  if (ext === '.doc') {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    return normalizeText(doc.getBody());
  }

  return '';
}

module.exports = { extractDocumentText };