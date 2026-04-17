// UsageMeter.js
// Tracks and enforces usage for The Grants Master

import UserMemory from '../memory/UserMemory.js';
import { trackEvent } from './Analytics';

const DEFAULT_USAGE = {
  grantDraftsCreated: 0,
  validatorRuns: 0,
  polisherRuns: 0,
  plannerRuns: 0,
  totalAgentCalls: 0,
  teamSeatsUsed: 0,
  onboardingCompleted: false,
  tier: 'free', // or 'pro'
  usageReset: Date.now(),
};

const TIER_LIMITS = {
  free: {
    grantDraftsCreated: 1,
    validatorRuns: 2,
    teamSeatsUsed: 0,
  },
  pro: {
    grantDraftsCreated: Infinity,
    validatorRuns: Infinity,
    teamSeatsUsed: 5,
  },
};

export function getUserUsage(userId, memory) {
  return UserMemory.getUser(userId, memory) || { ...DEFAULT_USAGE };
}

export function incrementUsage(userId, metric, memory, agentName = null, workflowName = null) {
  const usage = getUserUsage(userId, memory);
  usage[metric] = (usage[metric] || 0) + 1;
  usage.totalAgentCalls = (usage.totalAgentCalls || 0) + 1;
  UserMemory.setUser(userId, usage, memory);
  // Analytics: track agent/workflow usage
  if (agentName) trackEvent('agent_called', { agentName }, { userId, tier: usage.tier });
  if (workflowName) trackEvent('workflow_started', { workflowName }, { userId, tier: usage.tier });
  return usage;
}

export function resetUsageIfNeeded(userId, memory) {
  const usage = getUserUsage(userId, memory);
  const now = Date.now();
  // Reset if more than 30 days since last reset
  if (now - (usage.usageReset || 0) > 1000 * 60 * 60 * 24 * 30) {
    Object.assign(usage, { ...DEFAULT_USAGE, tier: usage.tier });
    usage.usageReset = now;
    UserMemory.setUser(userId, usage, memory);
  }
}

// Add onUpgradeModal callback for modal triggers
export function checkTierLimit(userId, metric, memory, onUpgradeModal) {
  const usage = getUserUsage(userId, memory);
  const tier = usage.tier || 'free';
  const limit = TIER_LIMITS[tier][metric];
  const allowed = typeof limit === 'undefined' ? true : usage[metric] < limit;
  if (!allowed && typeof onUpgradeModal === 'function') {
    onUpgradeModal({
      currentTier: tier,
      attemptedFeature: metric,
      upgradeOptions: tier === 'free' ? ['starter', 'pro'] : ['pro'],
      inviteOnly: tier !== 'free'
    });
  }
  return allowed;
}

// Add onUpgradeModal callback for modal triggers
export function enforceTierLimit(userId, metric, memory, onUpgradeModal) {
  if (!checkTierLimit(userId, metric, memory, onUpgradeModal)) {
    // Block, show upgrade prompt, log overage
    return {
      allowed: false,
      message: 'Usage limit exceeded. Upgrade for unlimited access.',
      upgradePrompt: true,
    };
  }
  return { allowed: true };
}

// Usage feedback UI helpers (for dashboard/sidebar)
export function getUsageFeedback(userId, memory) {
  const usage = getUserUsage(userId, memory);
  const tier = usage.tier || 'free';
  const limits = TIER_LIMITS[tier];
  return {
    grantDrafts: `${usage.grantDraftsCreated} of ${limits.grantDraftsCreated === Infinity ? '∞' : limits.grantDraftsCreated}`,
    validatorRuns: `${usage.validatorRuns} of ${limits.validatorRuns === Infinity ? '∞' : limits.validatorRuns}`,
    teamSeats: `${usage.teamSeatsUsed} of ${limits.teamSeatsUsed === Infinity ? '∞' : limits.teamSeatsUsed}`,
    upgradePrompt: tier === 'free',
  };
}

// CSS classes for UI: usageMeter, usageBar, upgradePrompt
