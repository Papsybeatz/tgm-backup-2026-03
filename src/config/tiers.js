export const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    features: ['draft_basic', 'view_drafts', 'brainstorming_unlimited', 'scoring_basic', 'export_pdf', 'export_doc', 'ny_grants', 'email_support'],
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
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'matching_basic', 'matching_engine', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'project_templates', 'priority_support'],
    limits: {
      drafts: 100,
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
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_3', 'shared_workspace', 'team_templates', 'team_activity_log', 'ny_funder_intelligence', 'ny_compliance_rules', 'document_uploads', 'custom_export_formatting'],
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
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_10', 'client_folders', 'client_templates', 'shared_workspace', 'white_label_header', 'white_label_full', 'priority_support', 'role_based_permissions', 'client_activity_logs', 'multi_client_dashboards'],
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
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_portfolio', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_unlimited', 'client_folders', 'client_templates', 'shared_workspace', 'white_label_full', 'priority_support', 'sla_support', 'admin_controls', 'multi_client_dashboards', 'dedicated_success_manager', 'quarterly_strategy_reviews', 'early_access'],
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
