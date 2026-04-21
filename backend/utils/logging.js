// backend/utils/logging.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logAiAction(userId, action) {
  try {
    await prisma.aiLog.create({
      data: { userId, action }
    });
  } catch (err) {
    console.error('Failed to log AI action:', err.message);
  }
}

async function logError(message, endpoint, userId, severity = 'info') {
  try {
    await prisma.errorLog.create({
      data: { message, endpoint, userId, severity }
    });
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }
}

module.exports = { logAiAction, logError };