export const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    features: ['draft_basic', 'view_drafts'],
    limits: {
      drafts: 5,
      scoring: 0,
      matching: 0,
      exports: false,
      teamSeats: 0
    },
    dashboardModules: ['draft']
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'scoring_basic', 'matching_basic', 'export_pdf'],
    limits: {
      drafts: 100,
      scoring: 10,
      matching: 10,
      exports: true,
      teamSeats: 0
    },
    dashboardModules: ['draft', 'scoring', 'matching']
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_1'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 1
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar']
  },
  agency_starter: {
    key: 'agency_starter',
    name: 'Agency Starter',
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_3', 'client_folders', 'shared_workspace', 'white_label_header', 'priority_support'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 3,
      clientFolders: true
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar', 'clients']
  },
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Agency Unlimited',
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'export_pdf', 'export_doc', 'analytics_portfolio', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_unlimited', 'client_folders', 'shared_workspace', 'white_label_full', 'priority_support', 'sla_support', 'admin_controls', 'multi_client_dashboards'],
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
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_1', 'priority_support', 'lifetime_badge', 'founder_certificate'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 1
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
    exportUnlocked:       tierAtLeast(tier, 'starter'),

    // Pro+
    scoringUnlocked:      tierAtLeast(tier, 'pro'),
    analyticsUnlocked:    tierAtLeast(tier, 'pro'),
    calendarUnlocked:     tierAtLeast(tier, 'pro'),
    goldBadge:            tierAtLeast(tier, 'pro'),

    // Agency+
    teamFeaturesUnlocked: tierAtLeast(tier, 'agency_starter'),
    clientFoldersUnlocked:tierAtLeast(tier, 'agency_starter'),
    whiteLabelUnlocked:   tierAtLeast(tier, 'agency_starter'),

    // Lifetime
    lifetimeBadge:        tier === 'lifetime',
  };
}
