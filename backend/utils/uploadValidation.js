// utils/uploadValidation.js
// Upload validation logic for Grants Master SaaS
// Accepts only .docx, .pdf, .txt, max 5MB, stub for malware scan

const path = require('path');

const ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.txt'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isAllowedExtension(filename) {
  return ALLOWED_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

function isAllowedSize(size) {
  return size <= MAX_FILE_SIZE;
}

function scanForMaliciousContent(fileBuffer) {
  // Stub: Integrate with external malware scanning service
  // For now, always return true (safe)
  return true;
}

function validateUpload(file) {
  if (!isAllowedExtension(file.originalname)) {
    return { valid: false, reason: 'Invalid file type' };
  }
  if (!isAllowedSize(file.size)) {
    return { valid: false, reason: 'File too large' };
  }
  if (!scanForMaliciousContent(file.buffer)) {
    return { valid: false, reason: 'Malicious content detected' };
  }
  return { valid: true };
}

module.exports = {
  validateUpload,
};
