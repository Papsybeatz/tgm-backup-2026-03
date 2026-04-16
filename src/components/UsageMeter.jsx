import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';

const TIER_LIMITS = {
  free: { drafts: 5, scoring: 0, matching: 0, analytics: false },
  starter: { drafts: 100, scoring: 10, matching: 10, analytics: 'basic' },
  pro: { drafts: Infinity, scoring: Infinity, matching: Infinity, analytics: 'advanced' },
  agency_starter: { drafts: Infinity, scoring: Infinity, matching: Infinity, analytics: 'advanced' },
  agency_unlimited: { drafts: Infinity, scoring: Infinity, matching: Infinity, analytics: 'portfolio' },
  lifetime: { drafts: Infinity, scoring: Infinity, matching: Infinity, analytics: 'advanced' }
};

export default function UsageMeter({ tier = 'free', onLimitReached }) {
  const { user = null } = useUser() ?? {};
  const [draftsUsed, setDraftsUsed] = useState(0);
  const [scoringUsed, setScoringUsed] = useState(0);
  const [matchingUsed, setMatchingUsed] = useState(0);
  
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const maxDrafts = limits.drafts;
  const maxScoring = limits.scoring;
  const maxMatching = limits.matching;
  
  const draftsLimitReached = maxDrafts !== Infinity && draftsUsed >= maxDrafts;
  const scoringLimitReached = maxScoring !== Infinity && scoringUsed >= maxScoring;
  const matchingLimitReached = maxMatching !== Infinity && matchingUsed >= maxMatching;

  useEffect(() => {
    if (user && user.userId) {
      fetch(`/api/usage/${user.userId}`)
        .then(res => res.json())
        .then(data => {
          setDraftsUsed(data.draftsUsed || 0);
          setScoringUsed(data.scoringUsed || 0);
          setMatchingUsed(data.matchingUsed || 0);
        })
        .catch(() => {});
    }
  }, [user?.userId]);

  if (!user) return null;

  useEffect(() => {
    if ((draftsLimitReached || scoringLimitReached || matchingLimitReached) && onLimitReached) {
      onLimitReached();
    }
  }, [draftsLimitReached, scoringLimitReached, matchingLimitReached]);

  const renderLimit = (used, max, label) => {
    if (max === Infinity) return null;
    const isReached = used >= max;
    return (
      <div style={{ marginBottom: 8 }}>
        <span>{label}: {used}/{max}</span>
        {isReached && <span style={{ color: 'red', marginLeft: 8 }}>Limit reached</span>}
      </div>
    );
  };

  if (tier === 'free' || tier === 'starter' || tier === 'pro' || tier === 'agency_starter' || tier === 'agency_unlimited' || tier === 'lifetime') {
    return (
      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 12 }}>Usage This Month</div>
        {renderLimit(draftsUsed, maxDrafts, 'Drafts')}
        {limits.scoring > 0 && renderLimit(scoringUsed, maxScoring, 'Scoring')}
        {limits.matching > 0 && renderLimit(matchingUsed, maxMatching, 'Grant Matches')}
        {limits.analytics && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
            Analytics: {limits.analytics === 'basic' ? 'Basic (draft quality trend)' : limits.analytics === 'advanced' ? 'Advanced charts' : 'Portfolio insights'}
          </div>
        )}
      </div>
    );
  }

  return null;
}
  }, [user && user.userId]);
  if (!user) {
    return <div>Loading user data...</div>;
  }

  useEffect(() => {
    if (limitReached && onLimitReached) onLimitReached();
  }, [limitReached, onLimitReached]);

  return (
    <div style={{ margin: '1rem 0', fontWeight: 'bold' }}>
      {tier === 'starter' && (
        <span>You’ve used {draftsUsed} of 15 drafts this month</span>
      )}
      {limitReached && (
        <span style={{ color: 'red', marginLeft: 8 }}>Limit reached</span>
      )}
    </div>
  );
}
