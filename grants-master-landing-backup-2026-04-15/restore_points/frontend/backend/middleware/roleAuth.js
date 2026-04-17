// middleware/roleAuth.js
// Middleware to protect admin and API routes

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ success: false, message: 'Authentication required' });
  }
  next();
}

module.exports = {
  requireAdmin,
  requireAuth,
};
