const TIERS = {
  free: {
    features: ['draft_basic', 'view_drafts'],
    limits: { drafts: 5, scoring: 0, matching: 0 }
  },
  starter: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'scoring_basic', 'matching_basic', 'export_pdf'],
    limits: { drafts: 100, scoring: 10, matching: 10 }
  },
  pro: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_1'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity }
  },
  agency_starter: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_3', 'client_folders', 'shared_workspace', 'white_label_header', 'priority_support'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 3, clientFolders: true }
  },
  agency_unlimited: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'scoring_bulk', 'matching_engine', 'matching_unlimited', 'matching_bulk', 'export_pdf', 'export_doc', 'analytics_portfolio', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_unlimited', 'client_folders', 'shared_workspace', 'white_label_full', 'priority_support', 'sla_support', 'admin_controls', 'multi_client_dashboards'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: Infinity, clientFolders: true }
  },
  lifetime: {
    features: ['draft_basic', 'draft_unlimited', 'view_drafts', 'ai_rewrite', 'ai_priority', 'scoring_engine', 'scoring_detailed', 'matching_engine', 'matching_unlimited', 'export_pdf', 'export_doc', 'analytics_advanced', 'reviewer_simulation', 'grant_calendar', 'project_templates', 'team_seats_1', 'priority_support', 'lifetime_badge', 'founder_certificate'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity }
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
