// GrantMemory.js
export default {
  getPlan: (userId, memory) => memory.GrantMemory?.[`${userId}_plan`] || null,
  getDraft: (userId, memory) => memory.GrantMemory?.[`${userId}_draft`] || null,
  getValidationNotes: (userId, memory) => memory.GrantMemory?.[`${userId}_validationNotes`] || [],

  // Evaluation results
  saveEvaluation: (userId, agent, evaluation, memory) => {
    if (!memory.GrantMemory) memory.GrantMemory = {};
    if (!memory.GrantMemory[`${userId}_evaluations`]) memory.GrantMemory[`${userId}_evaluations`] = [];
    memory.GrantMemory[`${userId}_evaluations`].push({ agent, evaluation, timestamp: Date.now() });
  },
  getEvaluations: (userId, memory) => memory.GrantMemory?.[`${userId}_evaluations`] || [],

  // Agent performance tracking
  getAgentAverageScores: (userId, agent, memory) => {
    const evals = (memory.GrantMemory?.[`${userId}_evaluations`] || []).filter(e => e.agent === agent);
    if (!evals.length) return null;
    const sum = {};
    let count = 0;
    evals.forEach(e => {
      Object.entries(e.evaluation.scores).forEach(([k, v]) => {
        if (typeof v === 'number') {
          sum[k] = (sum[k] || 0) + v;
        }
      });
      count++;
    });
    const avg = {};
    Object.entries(sum).forEach(([k, v]) => {
      avg[k] = Math.round(v / count);
    });
    return avg;
  },
};
