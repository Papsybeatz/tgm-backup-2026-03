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
    // Checkmate engine (scoring_basic) and sees its score, criteria and gaps,
    // but NOT scoring_detailed — so /api/score withholds the recommended fixes
    // until Starter. Free is capped at six scores a day; that cap is enforced
    // in utils/scoreGate.js, counted from the AiLog ledger.
    //
    // Every label in these lists is backed by a live gate or a live route; see
    // tests/tier-feature-existence.test.js. Export is available on every tier,
    // so it is listed on every tier and is not what an upgrade buys.
    features: ['draft_basic', 'scoring_basic', 'export_pdf', 'export_doc'],
    // Six daily uses, not one draft then a wall. `scoring` mirrors
    // FREE_SCORE_LIMIT in utils/scoreGate.js (pinned by tests/scoring-gate.test.js).
    limits: { drafts: 1, scoring: 6, actionsPerDay: 6, matching: 0 }
  },
  starter: {
    // The upgrade reason is "don't lose your work".
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity }
  },
  pro: {
    // The upgrade reason is collaboration.
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 3 }
  },
  agency_starter: {
    // The upgrade reason is throughput across clients.
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc', 'client_folders', 'client_aware_steve'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: 10, clientFolders: true }
  },
  agency_unlimited: {
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc', 'client_folders', 'client_aware_steve'],
    limits: { drafts: Infinity, scoring: Infinity, matching: Infinity, teamSeats: Infinity, clientFolders: true }
  },
  lifetime: {
    // Founding Member: everything in Starter, plus Pro's analytics, reviewer
    // simulation, calendar and priority AI, locked in forever. No seats and no
    // client folders — that is what keeps Pro and Agency intact.
    //
    // It carries exactly the Starter feature set, so "Everything in Starter,
    // forever" is now a statement the config can back rather than a promise
    // the card made on the config's behalf.
    features: ['draft_basic', 'draft_unlimited', 'scoring_basic', 'scoring_detailed', 'version_history', 'email_delivery', 'export_pdf', 'export_doc'],
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
