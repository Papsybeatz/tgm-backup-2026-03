const TIERS = {
  // ---------------------------------------------------------------------------
  // Gating model: tiers sell SAVE, HISTORY, EMAIL and MULTI-CLIENT WORK.
  //
  // They no longer sell AI capability. Steve does the drafting, scoring and
  // rewrites for every tier, so gating on 'ai_rewrite' or 'scoring_engine' was
  // selling something free users already had. What actually differs is whether
  // your work is kept, whether it can be sent, and whether Steve can work for
  // your clients.
  // ---------------------------------------------------------------------------
  free: {
    // Full capability, nothing kept: one grant, no history, no email. They can
    // still DOWNLOAD it — the payoff is what makes them upgrade.
    //
    // Model A: the paid unlock is the FIX, not the diagnosis. Free runs the
    // engine (scoring_basic + scoring_engine) and sees its score, criteria and
    // gaps, but NOT scoring_detailed — so /api/score withholds the recommended
    // fixes until Starter. Free is also capped at 3 scores; that cap is
    // enforced in utils/scoreGate.js, counted from the AiLog ledger.
    features: ['draft_basic', 'view_drafts', 'scoring_basic', 'scoring_engine', 'ai_rewrite', 'export_pdf', 'export_doc', 'ny_grants', 'email_support'],
    // Six daily uses, not one draft then a wall. `scoring` mirrors
    // FREE_SCORE_LIMIT in utils/scoreGate.js (pinned by tests/scoring-gate.test.js).
    limits: { drafts: 1, scoring: 6, actionsPerDay: 6, matching: 0 }
  },
  starter: {
    // The upgrade reason is "don't lose your work".
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'save_drafts', 'version_history', 'email_delivery', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'ai_rewrite', 'matching_basic', 'matching_engine', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'project_templates', 'priority_support'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity }
  },
  pro: {
    // The upgrade reason is collaboration.
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'save_drafts', 'version_history', 'email_delivery', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'ai_rewrite', 'ai_priority', 'matching_basic', 'matching_engine', 'matching_unlimited', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_3', 'shared_workspace', 'team_templates', 'team_activity_log', 'ny_funder_intelligence', 'ny_compliance_rules', 'document_uploads', 'custom_export_formatting'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 3 }
  },
  agency_starter: {
    // The upgrade reason is throughput across clients.
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'save_drafts', 'version_history', 'email_delivery', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'ai_rewrite', 'ai_priority', 'matching_basic', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_10', 'client_folders', 'client_aware_steve', 'client_templates', 'shared_workspace', 'white_label_header', 'white_label_full', 'priority_support', 'role_based_permissions', 'client_activity_logs', 'multi_client_dashboards'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 10, clientFolders: true }
  },
  agency_unlimited: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'save_drafts', 'version_history', 'email_delivery', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'ai_rewrite', 'ai_priority', 'matching_basic', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'analytics_portfolio', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_unlimited', 'client_folders', 'client_aware_steve', 'client_templates', 'shared_workspace', 'white_label_full', 'priority_support', 'sla_support', 'admin_controls', 'multi_client_dashboards', 'dedicated_success_manager', 'quarterly_strategy_reviews', 'early_access'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: Infinity, clientFolders: true }
  },
  lifetime: {
    // Founding Member: everything in Starter, plus Pro's analytics, reviewer
    // simulation, calendar and priority AI, locked in forever. No seats and no
    // client folders — that is what keeps Pro and Agency intact.
    //
    // This previously omitted funder_alignment, grant_fit_score,
    // missing_components and compliance_checks, all of which Starter has, while
    // the pricing card advertised "Everything in Starter, forever".
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'save_drafts', 'version_history', 'email_delivery', 'scoring_basic', 'scoring_engine', 'scoring_detailed', 'ai_rewrite', 'ai_priority', 'matching_basic', 'matching_engine', 'matching_unlimited', 'funder_alignment', 'grant_fit_score', 'missing_components', 'compliance_checks', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'priority_support', 'lifetime_badge', 'founder_certificate'],
    // teamSeats is explicit rather than omitted: seatCapFor() reads a missing
    // value as none, and stating 0 keeps that behaviour from looking accidental.
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 0 }
  }
};

function hasFeature(tier, feature) {
  const tierConfig = TIERS[tier] || TIERS.free;
  return tierConfig.features.includes(feature);
}

function requireFeature(feature) {
  return (req, res, next) => {
    const userTier = req.user?.tier || req.body?.tier || 'free';
    
    if (!hasFeature(userTier, feature)) {
      return res.status(403).json({ 
        error: 'Feature not available on your tier',
        currentTier: userTier,
        requiredFeature: feature
      });
    }
    next();
  };
}

function requireFeatureOrArray(features) {
  return (req, res, next) => {
    const userTier = req.user?.tier || req.body?.tier || 'free';
    const hasAny = features.some(f => hasFeature(userTier, f));
    
    if (!hasAny) {
      return res.status(403).json({ 
        error: 'Feature not available on your tier',
        currentTier: userTier,
        requiredFeatures: features
      });
    }
    next();
  };
}

module.exports = {
  TIERS,
  hasFeature,
  requireFeature,
  requireFeatureOrArray
};
