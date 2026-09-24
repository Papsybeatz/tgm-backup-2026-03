const fs = require('fs');
const path = require('path');

/**
 * Upload storage scoping.
 *
 * Uploads are always written to and read from a per-user directory
 * (`<root>/<sanitizedUserId>/`). A user can only ever see their own files —
 * there is no shared flat directory to enumerate.
 *
 * Note: files uploaded before this scoping existed may still sit directly in
 * the root directory. They are intentionally NOT listed by listUserUploads()
 * because their owner cannot be established, and listing them for every user
 * was the leak this module exists to close.
 */

function sanitizeUserId(userId) {
  const safe = String(userId == null ? '' : userId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) throw new Error('A valid user id is required to scope uploads');
  return safe;
}

function userUploadDir(rootDir, userId) {
  const dir = path.join(rootDir, sanitizeUserId(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function listUserUploads(rootDir, userId) {
  try {
    const dir = userUploadDir(rootDir, userId);
    return fs
      .readdirSync(dir)
      .filter((file) => !file.startsWith('.'))
      .map((file) => {
        const stat = fs.statSync(path.join(dir, file));
        return {
          filename: file,
          name: file.replace(/^\d+-/, ''),
          size: stat.size,
          uploadedAt: stat.mtime,
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  } catch (error) {
    return [];
  }
}

module.exports = { sanitizeUserId, userUploadDir, listUserUploads };
