// EvaluatorAgent.js
// Agent Self-Evaluation Loop for The Grants Master

const EVALUATION_CRITERIA = [
  'clarity',
  'alignment',
  'completeness',
  'tone',
  'structural',
  'funderFit',
  'redundancy'
];

const DEFAULT_THRESHOLD = 80;

function scoreOutput(output, context = {}) {
  // Placeholder: In production, use LLM or advanced heuristics
  // Here, random scores for demo; replace with real logic
  const scores = {
    clarity: Math.floor(70 + Math.random() * 30),
    alignment: Math.floor(70 + Math.random() * 30),
    completeness: Math.floor(60 + Math.random() * 40),
    tone: Math.floor(70 + Math.random() * 30),
    structural: Math.floor(70 + Math.random() * 30),
    funderFit: context.funderFitRelevant ? Math.floor(60 + Math.random() * 40) : undefined,
    redundancy: Math.floor(70 + Math.random() * 30)
  };
  return scores;
}

function summarize(scores, output) {
  // Simple summary logic; replace with LLM in production
  let summary = [];
  if (scores.completeness < 80) summary.push('Missing key details.');
  if (scores.clarity < 80) summary.push('Could be clearer.');
  if (scores.tone < 80) summary.push('Tone could be improved.');
  if (scores.redundancy < 80) summary.push('Some repetition detected.');
  if (scores.funderFit !== undefined && scores.funderFit < 80) summary.push('Funder fit may be weak.');
  if (summary.length === 0) summary.push('Output meets quality standards.');
  return summary.join(' ');
}

export default async function EvaluatorAgent({ output, context = {}, previousAgent = '', threshold = DEFAULT_THRESHOLD }) {
  const scores = scoreOutput(output, context);
  const summary = summarize(scores, output);
  const minScore = Math.min(...Object.values(scores).filter(x => typeof x === 'number'));
  const retryRecommended = minScore < threshold;
  const suggestedNextAgent = retryRecommended ? (previousAgent === 'PolisherAgent' ? previousAgent : 'PolisherAgent') : null;
  return {
    scores,
    summary,
    suggestedNextAgent,
    retryRecommended
  };
}

// For admin dashboard: export criteria
export { EVALUATION_CRITERIA, DEFAULT_THRESHOLD };
