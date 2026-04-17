// BetaGate.js
// Invite-only beta mode for The Grants Master

import { trackEvent } from './Analytics';
const INVITE_CODES = [
  'BETA2026-ALPHA', // Example codes; in production, store securely in backend
  'BETA2026-TEAM',
  'BETA2026-AGENCY'
];

export function getBetaAccess(userId, memory) {
  return (memory.UserMemory?.[userId]?.betaAccess) || 'pending';
}

export function setBetaAccess(userId, status, memory) {
  if (!memory.UserMemory) memory.UserMemory = {};
  if (!memory.UserMemory[userId]) memory.UserMemory[userId] = {};
  memory.UserMemory[userId].betaAccess = status;
}

export function validateInviteCode(code) {
  return INVITE_CODES.includes(code);
}

export function handleInviteCode(userId, code, memory) {
  trackEvent('invite_code_entered', { code }, { userId });
  if (validateInviteCode(code)) {
    setBetaAccess(userId, 'invited', memory);
    trackEvent('beta_access_granted', { code }, { userId });
    return { success: true, status: 'invited' };
  } else {
    setBetaAccess(userId, 'denied', memory);
    return { success: false, status: 'denied', error: 'Invalid invite code.' };
  }
}

export function requireBetaAccess(userId, memory) {
  const access = getBetaAccess(userId, memory);
  return access === 'invited';
}

// Admin controls (stub)
export function adminGenerateInviteCode() {
  // In production, generate and store securely
  return 'BETA2026-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}
export function adminRevokeAccess(userId, memory) {
  setBetaAccess(userId, 'denied', memory);
}
export function adminViewPending(memory) {
  return Object.entries(memory.UserMemory || {}).filter(([_, u]) => u.betaAccess === 'pending');
}
export function adminApproveUser(userId, memory) {
  setBetaAccess(userId, 'invited', memory);
}

// CSS classes: betaGate, betaCard, inviteInput, inviteButton
