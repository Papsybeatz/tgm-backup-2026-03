export const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    features: ['draft_basic', 'scoring_basic', 'export_pdf', 'export_doc'],
    limits: {
      drafts: 1,
      scoring: 3,
      matching: 0,
      exports: true,
      teamSeats: 0
    },
    dashboardModules: ['draft']
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 0
    },
    dashboardModules: ['draft', 'scoring', 'matching']
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 3
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar']
  },
  agency_starter: {
    key: 'agency_starter',
    name: 'Agency',
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc', 'client_folders', 'client_aware_steve'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 10,
      clientFolders: true
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar', 'clients']
  },
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Agency+',
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc', 'client_folders', 'client_aware_steve'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: Infinity,
      clientFolders: true
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar', 'clients', 'portfolio', 'admin']
  },
  lifetime: {
    key: 'lifetime',
    name: 'Lifetime',
    // It carries exactly the Starter feature set, so "Everything in Starter,
    // forever" is a statement the config can back.
    //
    // Seats are deliberately 0, not 1: the backend (routes/teamInvites.js
    // seatCapFor) has always treated a missing teamSeats as none, so the old
    // `1` here only ever showed a seat the API would refuse.
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 0
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar']
  }
};

export function hasFeature(tier, feature) {
  const tierConfig = TIERS[tier] || TIERS.free;
  return tierConfig.features.includes(feature);
}

export function getDashboardModules(tier) {
  const tierConfig = TIERS[tier] || TIERS.free;
  return tierConfig.dashboardModules;
}

export function getTierLimits(tier) {
  const tierConfig = TIERS[tier] || TIERS.free;
  return tierConfig.limits;
}

export function isWithinLimit(tier, resource, currentUsage) {
  const limits = getTierLimits(tier);
  const limit = limits[resource];
  if (limit === undefined || limit === Infinity) return true;
  return currentUsage < limit;
}

// Tier order for comparison
const TIER_ORDER = ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited', 'lifetime'];

export function tierAtLeast(userTier, requiredTier) {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

// Boolean gate flags per tier — used by UI components
export function getTierGates(tier) {
  return {
    // Free
    workspaceUnlocked:    true,
    upgradeCTAVisible:    tier === 'free',

    // Starter+
    aiActionsUnlocked:    tierAtLeast(tier, 'starter'),
    templatesUnlocked:    tierAtLeast(tier, 'starter'),
    grantMatchesUnlocked: tierAtLeast(tier, 'starter'),

    // Free — download is the payoff that makes them upgrade, so it is never
    // gated. Free ships export_pdf and export_doc (see the feature list above),
    // and the pricing page advertises "Export to PDF" on Free. This said
    // tierAtLeast(tier, 'starter'), which locked a feature Free already had.
    exportUnlocked:       true,

    // Starter+ — Checkmate scoring. Free gets scoring_basic only; Starter adds
    // scoring_engine and scoring_detailed. This said tierAtLeast(tier, 'pro'),
    // which locked scoring for paying Starter customers. The pricing table and
    // the editor's own isStarterPlus gate both put scoring at Starter.
    scoringUnlocked:      tierAtLeast(tier, 'starter'),

    // Pro+
    analyticsUnlocked:    tierAtLeast(tier, 'pro'),
    calendarUnlocked:     tierAtLeast(tier, 'pro'),
    goldBadge:            tierAtLeast(tier, 'pro'),

    // Pro+ — Pro ships team_seats_3, shared_workspace and the team activity log.
    // This said tierAtLeast(tier, 'agency_starter'), which locked team features
    // for paying Pro customers.
    teamFeaturesUnlocked: tierAtLeast(tier, 'pro'),

    // Agency+
    clientFoldersUnlocked:tierAtLeast(tier, 'agency_starter'),
    whiteLabelUnlocked:   tierAtLeast(tier, 'agency_starter'),

    // Lifetime
    lifetimeBadge:        tier === 'lifetime',
  };
}
