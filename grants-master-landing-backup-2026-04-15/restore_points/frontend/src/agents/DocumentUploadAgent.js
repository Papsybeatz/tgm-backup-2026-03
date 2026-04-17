// DocumentUploadAgent.js
// Handles file upload, extraction, classification, and routing for The Grants Master
import GrantMemory from '../memory/GrantMemory.js';

// Simulated parsers (replace with real libraries in production)
function extractTextFromPDF(buffer) {
  // Simulate PDF extraction
  return 'Extracted PDF text.';
}
function extractTextFromWord(buffer) {
  // Simulate Word extraction
  return 'Extracted Word text.';
}
function extractTextFromText(buffer) {
  return buffer.toString();
}
function extractTextFromMarkdown(buffer) {
  return buffer.toString();
}

function cleanText(text) {
  // Remove headers/footers/artifacts (placeholder)
  return text.replace(/\n{2,}/g, '\n').trim();
}

function classifyDocument(text) {
  // Simple keyword-based classification (replace with ML in production)
  const lower = text.toLowerCase();
  if (/guidelines|eligibility|criteria/.test(lower)) return { type: 'Grant Guidelines', confidence: 0.92 };
  if (/rfp|nofo|funding opportunity/.test(lower)) return { type: 'RFP', confidence: 0.92 };
  if (/budget|costs|expenses/.test(lower)) return { type: 'Budget Document', confidence: 0.9 };
  if (/narrative|notes|outline/.test(lower)) return { type: 'Narrative Notes', confidence: 0.85 };
  if (/project|proposal|draft/.test(lower)) return { type: 'Past Grant Draft', confidence: 0.88 };
  return { type: 'Miscellaneous Text', confidence: 0.6 };
}

function detectFileType(filename) {
  if (/\.pdf$/i.test(filename)) return 'pdf';
  if (/\.docx?$/i.test(filename)) return 'word';
  if (/\.txt$/i.test(filename)) return 'text';
  if (/\.md$/i.test(filename)) return 'markdown';
  return null;
}

function getRecommendedRoute(docType) {
  if (docType === 'Grant Guidelines' || docType === 'RFP') return 'PlannerAgent';
  if (docType === 'Past Grant Draft') return 'ValidatorAgent';
  if (docType === 'Budget Document') return 'PlannerAgent';
  if (docType === 'Narrative Notes') return 'PlannerAgent';
  return 'PlannerAgent';
}

export default {
  name: 'DocumentUploadAgent',
  description: 'Accepts user-uploaded files, extracts content, classifies, and routes to downstream agents.',
  capabilities: ['file upload', 'extraction', 'classification', 'routing'],
  handler: async (input, memory, userId = 'default') => {
    const { filename, bufferOrBase64 } = input;
    let buffer;
    try {
      if (typeof bufferOrBase64 === 'string') {
        buffer = Buffer.from(bufferOrBase64, 'base64');
      } else {
        buffer = bufferOrBase64;
      }
    } catch (e) {
      return {
        output: {
          error: 'Failed to decode file input.',
          summary: 'Extraction failure',
        },
        metadata: { step: 'document-upload' },
        updatedMemory: memory
      };
    }
    const fileType = detectFileType(filename);
    if (!fileType) {
      return {
        output: {
          error: 'Unsupported file type.',
          summary: 'Only PDF, Word, Text, and Markdown files are supported.'
        },
        metadata: { step: 'document-upload' },
        updatedMemory: memory
      };
    }
    let extractedText = '';
    try {
      if (fileType === 'pdf') extractedText = extractTextFromPDF(buffer);
      else if (fileType === 'word') extractedText = extractTextFromWord(buffer);
      else if (fileType === 'text') extractedText = extractTextFromText(buffer);
      else if (fileType === 'markdown') extractedText = extractTextFromMarkdown(buffer);
    } catch (e) {
      return {
        output: {
          error: 'Extraction failed.',
          summary: 'Could not extract text from file.'
        },
        metadata: { step: 'document-upload' },
        updatedMemory: memory
      };
    }
    extractedText = cleanText(extractedText);
    if (!extractedText) {
      return {
        output: {
          error: 'No usable content found.',
          summary: 'Empty document.'
        },
        metadata: { step: 'document-upload' },
        updatedMemory: memory
      };
    }
    const { type: documentType, confidence } = classifyDocument(extractedText);
    const recommendedRoute = getRecommendedRoute(documentType);
    const summary = `This appears to be a ${documentType.toLowerCase()}${documentType === 'RFP' ? ' with eligibility and narrative requirements.' : '.'}`;
    // Save to GrantMemory
    const docKey = `${userId}_uploaded_${Date.now()}`;
    if (!memory.GrantMemory) memory.GrantMemory = {};
    memory.GrantMemory[docKey] = {
      documentType,
      confidence,
      extractedText,
      filename,
      uploadedAt: new Date().toISOString()
    };
    // Save classification metadata
    if (!memory.GrantMemory[`${userId}_docMeta`]) memory.GrantMemory[`${userId}_docMeta`] = [];
    memory.GrantMemory[`${userId}_docMeta`].push({ docKey, documentType, confidence, filename });
    return {
      output: {
        documentType,
        confidence,
        extractedText,
        recommendedRoute,
        summary
      },
      metadata: { step: 'document-upload', docKey },
      updatedMemory: memory
    };
  }
};
