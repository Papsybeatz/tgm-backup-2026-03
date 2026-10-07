export const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    features: ['draft_basic', 'view_drafts', 'brainstorming_unlimited', 'scoring_basic', 'export_pdf', 'export_doc', 'ny_grants', 'email_support'],
    // Free = six daily uses, not a one-draft cliff: a visitor has to stay
    // attached long enough to convert. `scoring` mirrors FREE_SCORE_LIMIT in
    // backend/utils/scoreGate.js (pinned by tests/scoring-gate.test.js).
    limits: {
      drafts: 1,
      scoring: 6,
      actionsPerDay: 6,
      matching: 0,
      exports: true,
      teamSeats: 0
    },
    dashboardModules: ['draft']
  },
  starter: {
    key: 'starter',
    // Display name only — the internal key stays `starter` because it is
    // referenced across src/, backend/ and the User.tier column.
    name: 'Grant Writer',
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'matching_basic', 'matching_engine', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'project_templates', 'priority_support'],
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
    name: 'Grant Consultant',
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
    name: 'Grant Agency',
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
  // Grandfathered, no longer sold — existing Agency+ accounts keep their access.
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Grant Agency (legacy)',
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
  // Grandfathered, no longer sold — Founder Lifetime accounts keep their access.
  lifetime: {
    key: 'lifetime',
    name: 'Founding Member (legacy)',
    // Everything in Starter, plus Pro's analytics, reviewer simulation,
    // calendar and priority AI. It previously omitted funder_alignment,
    // grant_fit_score, missing_components and compliance_checks — four features
    // Starter ($29/mo) has — while the card advertised "Everything in Starter,
    // forever", so the tier and its own description disagreed.
    //
    // Seats are deliberately 0, not 1: the backend (routes/teamInvites.js
    // seatCapFor) has always treated a missing teamSeats as none, so the old
    // `1` here only ever showed a seat the API would refuse.
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'matching_basic', 'matching_engine', 'matching_unlimited', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'priority_support', 'lifetime_badge', 'founder_certificate'],
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
