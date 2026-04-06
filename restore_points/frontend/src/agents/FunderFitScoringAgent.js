// FunderFitScoringAgent.js
// Evaluates project/funder fit and produces a structured score and explanation
import GrantMemory from '../memory/GrantMemory.js';

function parseFunderGuidelines(guidelines) {
  // Simulate parsing: extract keywords for demo
  if (!guidelines) return {};
  const lower = guidelines.toLowerCase();
  return {
    mission: lower.match(/mission: ([^\n]+)/)?.[1] || '',
    eligibility: lower.match(/eligibility: ([^\n]+)/)?.[1] || '',
    geography: lower.match(/geography: ([^\n]+)/)?.[1] || '',
    fundingRange: lower.match(/funding: ([^\n]+)/)?.[1] || '',
    priorities: lower.match(/priorities: ([^\n]+)/)?.[1] || '',
    deadline: lower.match(/deadline: ([^\n]+)/)?.[1] || ''
  };
}

function scoreCriterion(user, funder, key, weight = 1) {
  // Simulate scoring: basic keyword/number matching
  switch (key) {
    case 'missionAlignment':
      return user.projectDescription && funder.mission && user.projectDescription.toLowerCase().includes(funder.mission) ? 90 : 60;
    case 'eligibilityFit':
      return user.organizationMission && funder.eligibility && user.organizationMission.toLowerCase().includes(funder.eligibility) ? 100 : 70;
    case 'geographicFit':
      return user.geographicLocation && funder.geography && user.geographicLocation.toLowerCase().includes(funder.geography) ? 75 : 50;
    case 'fundingFit':
      if (!user.fundingAmountNeeded || !funder.fundingRange) return 60;
      const [min, max] = funder.fundingRange.replace(/[^\d\-]/g, '').split('-').map(Number);
      return user.fundingAmountNeeded >= min && user.fundingAmountNeeded <= max ? 80 : 60;
    case 'narrativeFit':
      return user.projectDescription && funder.priorities && user.projectDescription.toLowerCase().includes(funder.priorities) ? 85 : 65;
    case 'evidenceFit':
      return user.projectDescription && /data|outcome|evidence/.test(user.projectDescription.toLowerCase()) ? 70 : 50;
    case 'deadlineFit':
      return funder.deadline ? 95 : 80;
    default:
      return 60;
  }
}

export default {
  name: 'FunderFitScoringAgent',
  description: 'Evaluates project/funder fit and produces a structured score and explanation.',
  capabilities: ['scoring', 'funder fit', 'recommendation'],
  handler: async (input, memory, userId = 'default') => {
    const { projectDescription, organizationMission, targetPopulation, geographicLocation, fundingAmountNeeded, funderGuidelines, pastAwards } = input;
    const funder = parseFunderGuidelines(funderGuidelines);
    const user = { projectDescription, organizationMission, targetPopulation, geographicLocation, fundingAmountNeeded };
    const criteria = {
      missionAlignment: scoreCriterion(user, funder, 'missionAlignment'),
      eligibilityFit: scoreCriterion(user, funder, 'eligibilityFit'),
      geographicFit: scoreCriterion(user, funder, 'geographicFit'),
      fundingFit: scoreCriterion(user, funder, 'fundingFit'),
      narrativeFit: scoreCriterion(user, funder, 'narrativeFit'),
      evidenceFit: scoreCriterion(user, funder, 'evidenceFit'),
      deadlineFit: scoreCriterion(user, funder, 'deadlineFit')
    };
    // Weighted overall score
    const weights = { missionAlignment: 2, eligibilityFit: 2, geographicFit: 1, fundingFit: 1, narrativeFit: 1, evidenceFit: 1, deadlineFit: 1 };
    const total = Object.keys(criteria).reduce((sum, k) => sum + criteria[k] * (weights[k] || 1), 0);
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const overallScore = Math.round(total / weightSum);
    // Explanation
    let summary = 'Strong mission alignment and eligibility.';
    if (criteria.fundingFit < 70) summary += ' Funding request slightly above typical award range.';
    if (criteria.geographicFit < 60) summary += ' Project may not fit funder geography.';
    // Save funder profile and score
    if (!memory.GrantMemory) memory.GrantMemory = {};
    const funderKey = `${userId}_funder_${Date.now()}`;
    memory.GrantMemory[funderKey] = { funder, criteria, overallScore };
    return {
      output: {
        overallScore,
        criteria,
        summary,
        recommendedNextAgent: 'PlannerAgent'
      },
      metadata: { step: 'funder-fit', funderKey },
      updatedMemory: memory
    };
  }
};
