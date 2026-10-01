// GrantDraftComparisonAgent.js
// Compares two or more grant drafts and produces a structured, criteria-based evaluation
import GrantMemory from '../memory/GrantMemory.js';

const DEFAULT_CRITERIA = [
  'clarity',
  'alignment',
  'completeness',
  'tone',
  'structure',
  'narrative',
  'compliance'
];

function scoreDraft(draft, rubric, guidelines) {
  // Simulate scoring: random but deterministic for demo
  const base = draft.length % 100;
  return {
    clarity: Math.min(100, base + 10),
    alignment: Math.min(100, base + 20),
    completeness: Math.min(100, base + 15),
    tone: Math.min(100, base + 12),
    structure: Math.min(100, base + 8),
    narrative: Math.min(100, base + 14),
    compliance: guidelines ? Math.min(100, base + 18) : undefined
  };
}

function compareScores(scoresA, scoresB) {
  const result = {};
  for (const key of Object.keys(scoresA)) {
    result[key] = { A: scoresA[key], B: scoresB[key] };
  }
  return result;
}

function recommend(scoresA, scoresB, draftA, draftB) {
  // Simple: sum scores, pick higher
  const sumA = Object.values(scoresA).reduce((a, b) => a + (b || 0), 0);
  const sumB = Object.values(scoresB).reduce((a, b) => a + (b || 0), 0);
  if (sumA > sumB) {
    return {
      summary: 'Draft A is stronger overall due to higher scores.',
      recommendation: 'Use Draft A as the base. Improve Draft B by strengthening the problem statement and adding missing budget justification.',
      suggestedNextAgent: 'PolisherAgent',
      stronger: 'A', weaker: 'B'
    };
  } else {
    return {
      summary: 'Draft B is stronger overall due to higher scores.',
      recommendation: 'Use Draft B as the base. Improve Draft A by clarifying objectives and improving structure.',
      suggestedNextAgent: 'PolisherAgent',
      stronger: 'B', weaker: 'A'
    };
  }
}

export default {
  name: 'GrantDraftComparisonAgent',
  description: 'Compares two or more grant drafts and produces a structured, criteria-based evaluation.',
  capabilities: ['comparison', 'scoring', 'recommendation'],
  handler: async (input, memory, userId = 'default') => {
    const { draftA, draftB, guidelines, rubric } = input;
    if (!draftA || !draftB) {
      return {
        output: { error: 'Both draftA and draftB are required.' },
        metadata: { step: 'comparison' },
        updatedMemory: memory
      };
    }
    const scoresA = scoreDraft(draftA, rubric, guidelines);
    const scoresB = scoreDraft(draftB, rubric, guidelines);
    const scores = compareScores(scoresA, scoresB);
    const rec = recommend(scoresA, scoresB, draftA, draftB);
    // Save to GrantMemory
    if (!memory.GrantMemory) memory.GrantMemory = {};
    const cmpKey = `${userId}_comparison_${Date.now()}`;
    memory.GrantMemory[cmpKey] = {
      scores,
      summary: rec.summary,
      recommendation: rec.recommendation,
      stronger: rec.stronger,
      weaker: rec.weaker,
      drafts: { A: draftA, B: draftB }
    };
    // Tag drafts
    memory.GrantMemory[`${userId}_draftA_tag`] = rec.stronger === 'A' ? 'stronger' : 'weaker';
    memory.GrantMemory[`${userId}_draftB_tag`] = rec.stronger === 'B' ? 'stronger' : 'weaker';
    return {
      output: {
        summary: rec.summary,
        scores,
        recommendation: rec.recommendation,
        suggestedNextAgent: rec.suggestedNextAgent
      },
      metadata: { step: 'comparison', cmpKey },
      updatedMemory: memory
    };
  }
};
