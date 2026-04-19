const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const requireAuth = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
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
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({
    success: true,
    file: {
      name: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    },
  });
});

// GET /api/documents — list uploaded files for user session (in-memory for now)
router.get('/', requireAuth, (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(f => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return { filename: f, name: f.replace(/^\d+-/, ''), size: stat.size, uploadedAt: stat.mtime };
    }).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json({ success: true, files });
  } catch {
    res.json({ success: true, files: [] });
  }
});

module.exports = router;
