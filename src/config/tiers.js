export const TIERS = {
  free: {
    key: 'free',
    name: 'Free',
    // Every label here is backed by a live gate or a live route; see
    // tests/tier-feature-existence.test.js. Export is available on every tier,
    // so it is not what an upgrade buys.
    features: ['draft_basic', 'scoring_basic', 'export_pdf', 'export_doc'],
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
    name: 'Grant Consultant',
    // Client folders sit here, not only on Agency. The ladder sells capacity and
    // depth, not deprivation: a $79 tier that added nothing but three seats over
    // the $29 tier was a step most buyers would skip. Agency keeps what actually
    // separates a firm from a freelancer — 10 seats and client-aware Steve.
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc', 'client_folders'],
    limits: {
      drafts: Infinity,
      scoring: Infinity,
      matching: Infinity,
      exports: true,
      teamSeats: 3,
      clientFolders: true
    },
    dashboardModules: ['draft', 'scoring', 'matching', 'analytics', 'calendar']
  },
  agency_starter: {
    key: 'agency_starter',
    name: 'Grant Agency',
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
  // Grandfathered, no longer sold — existing Agency+ accounts keep their access.
  agency_unlimited: {
    key: 'agency_unlimited',
    name: 'Grant Agency (legacy)',
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
  // Grandfathered, no longer sold — Founder Lifetime accounts keep their access.
  lifetime: {
    key: 'lifetime',
    name: 'Founding Member (legacy)',
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

    // Pro+ — client folders start at Grant Consultant, matching the feature
    // list above. A gate stricter than the feature list is the "you bought it
    // and still can't use it" bug this test exists to catch.
    clientFoldersUnlocked:tierAtLeast(tier, 'pro'),

    // Agency+
    whiteLabelUnlocked:   tierAtLeast(tier, 'agency_starter'),

    // Lifetime
    lifetimeBadge:        tier === 'lifetime',
  };
}
