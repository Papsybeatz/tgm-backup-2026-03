
// FeatureGate.js
// Tier-based feature gating for The Grants Master
import { trackEvent } from './Analytics';

const TIER_PERMISSIONS = {
  free: {
    grantDrafts: 1,
    validatorRuns: 2,
    memory: false,
    download: false,
    teamSeats: 0,
    inviteRequired: false
  },
  starter: {
    grantDrafts: 5,
    validatorRuns: 5,
    memory: true,
    download: true,
    teamSeats: 1,
    inviteRequired: false
  },
  pro: {
    grantDrafts: Infinity,
    validatorRuns: Infinity,
    memory: true,
    download: true,
    teamSeats: 5,
    inviteRequired: true
  },
  agency: {
    grantDrafts: Infinity,
    validatorRuns: Infinity,
    memory: true,
    download: true,
    teamSeats: 25,
    prioritySupport: true,
    dedicatedOnboarding: true,
    inviteRequired: true
  }
};

export function getTierPermissions(tier) {
  return TIER_PERMISSIONS[tier] || TIER_PERMISSIONS.free;
}

export function isFeatureAllowed(tier, feature, usage = {}, user = {}, onUpgradeModal) {
  const perms = getTierPermissions(tier);
  // Invite gating for Pro/Agency
  if (perms.inviteRequired && user.betaAccess !== 'invited') {
    if (typeof onUpgradeModal === 'function') {
      onUpgradeModal({
        currentTier: tier,
          attemptedFeature: feature,
          upgradeOptions: ['pro'],
          inviteOnly: true
        });
      }
      return false;
    }
    if (typeof perms[feature] === 'boolean') {
      if (!perms[feature] && (tier === 'free' || tier === 'starter') && typeof onUpgradeModal === 'function') {
        onUpgradeModal({
          currentTier: tier,
          attemptedFeature: feature,
          upgradeOptions: tier === 'free' ? ['starter', 'pro'] : ['pro'],
          inviteOnly: tier !== 'free'
        });
      }
      return perms[feature];
    }
    if (typeof perms[feature] === 'number') {
      const allowed = (usage[feature] || 0) < perms[feature];
      if (!allowed && (tier === 'free' || tier === 'starter') && typeof onUpgradeModal === 'function') {
        onUpgradeModal({
          currentTier: tier,
          attemptedFeature: feature,
          upgradeOptions: tier === 'free' ? ['starter', 'pro'] : ['pro'],
          inviteOnly: tier !== 'free'
        });
      }
      return allowed;
    }
    // Unlimited or not defined
    return true;
}

// Add onUpgradeModal to gateFeature signature
export function gateFeature({ tier, feature, usage, onBlock, onUpgrade, user, onUpgradeModal }) {
  if (!isFeatureAllowed(tier, feature, usage, user, onUpgradeModal)) {
    // Analytics instrumentation
    if (typeof window !== 'undefined') {
      try {
        if (typeof user !== 'undefined') trackEvent('feature_blocked', { feature, tier }, user);
      } catch (e) {}
    }
    // If Pro/Agency and not invited, trigger upgrade modal
    const perms = getTierPermissions(tier);
    if (perms.inviteRequired && user.betaAccess !== 'invited') {
      if (onBlock) onBlock('invite');
      return false;
    }
    // If hit usage limit, trigger upgrade modal
    if (onBlock) onBlock('limit');
    if (onUpgrade) {
      if (typeof window !== 'undefined') {
        try {
          if (typeof user !== 'undefined') trackEvent('upgrade_clicked', { feature, tier }, user);
        } catch (e) {}
      }
      onUpgrade();
    }
    return false;
  }
  return true;
}

// UI helpers
export function gatedFeatureProps(tier, feature, usage) {
  const allowed = isFeatureAllowed(tier, feature, usage);
  return {
    className: allowed ? '' : 'gatedFeature',
    title: allowed ? '' : 'Upgrade to unlock',
    'data-locked': !allowed,
  };
}

// CSS classes: gatedFeature, upgradePrompt, lockIcon
