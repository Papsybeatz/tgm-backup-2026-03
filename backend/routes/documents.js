const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { extractDocumentText } = require('../utils/extractDocumentText');
const { userUploadDir, listUserUploads } = require('../utils/uploadStorage');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  // requireAuth runs before multer on this route, so req.user is always set.
  // Files land in a per-user directory so no user can enumerate another's.
  destination: (req, file, cb) => {
    try {
      cb(null, userUploadDir(UPLOAD_ROOT, req.user && req.user.id));
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.png','.jpg','.jpeg','.xlsx','.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const extractedText = await extractDocumentText(req.file.path);
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
      extractedText,
    });
  } catch (error) {
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
      extractedText: '',
      message: 'Upload stored, but text extraction was limited for this file type.',
    });
  }
});

// GET /api/documents — the authenticated user's own uploads only
router.get('/', requireAuth, (req, res) => {
  res.json({ success: true, files: listUserUploads(UPLOAD_ROOT, req.user && req.user.id) });
});

module.exports = router;
