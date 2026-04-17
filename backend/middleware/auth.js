const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Simple auth middleware that validates a session token (Bearer) and
 * attaches `req.user` (Prisma User) when valid.
 */
module.exports = async function requireAuth(req, res, next) {
  try {
    // Accept Bearer token, cookie 'session', or token in body
    const authHeader = req.headers.authorization || '';
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    if (!token && req.cookies && req.cookies.session) token = req.cookies.session;
    if (!token) token = req.body?.token || null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || new Date() > session.expiresAt) return res.status(401).json({ success: false, message: 'Session not found or expired' });
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    console.error('[AUTH] middleware error', e);
    return res.status(500).json({ success: false, message: 'Auth error' });
  }
};
