import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { getTierLimits } from '../config/tiers';

export default function UsageMeter({ tier = 'free', onLimitReached }) {
  const { user = null } = useUser() ?? {};
  const [draftsUsed, setDraftsUsed] = useState(0);
  const [scoringUsed, setScoringUsed] = useState(0);
  const [matchingUsed, setMatchingUsed] = useState(0);

  const limits = getTierLimits(tier);

  const draftsLimitReached = limits.drafts !== Infinity && draftsUsed >= limits.drafts;
  const scoringLimitReached = limits.scoring !== Infinity && scoringUsed >= limits.scoring;
  const matchingLimitReached = limits.matching !== Infinity && matchingUsed >= limits.matching;

  useEffect(() => {
    if (user?.userId) {
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

  useEffect(() => {
    if ((draftsLimitReached || scoringLimitReached || matchingLimitReached) && onLimitReached) {
      onLimitReached();
    }
  }, [draftsLimitReached, scoringLimitReached, matchingLimitReached]);

  if (!user) return null;

  const renderMeter = (used, max, label) => {
    if (max === Infinity || max === 0) return null;
    const isReached = used >= max;
    return (
      <div className="flex-between mb-xs">
        <span className="text-sm text-muted">{label}: {used}/{max}</span>
        {isReached && <span className="text-sm text-error">Limit reached</span>}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header">Usage This Month</div>
      <div className="card-body">
        {renderMeter(draftsUsed, limits.drafts, 'Drafts')}
        {renderMeter(scoringUsed, limits.scoring, 'Scoring')}
        {renderMeter(matchingUsed, limits.matching, 'Grant Matches')}
      </div>
    </div>
  );
}
