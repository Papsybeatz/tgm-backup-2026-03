// GrantMatchingAgent.js
// Matches user projects/orgs to relevant grants using structured criteria and memory
import GrantMemory from '../memory/GrantMemory.js';

// Example grant dataset (replace with API or DB in production)
const GRANT_DATASET = [
  {
    grantName: "Community Health Grant",
    funder: "Health Foundation",
    mission: "health",
    eligibility: ["nonprofit", "school"],
    location: ["USA", "California"],
    amountRange: "$10,000-$50,000",
    deadline: "2026-03-15",
    projectTypes: ["program", "research"]
  },
  {
    grantName: "STEM Innovation Fund",
    funder: "Tech Philanthropy",
    mission: "STEM",
    eligibility: ["nonprofit", "startup"],
    location: ["USA"],
    amountRange: "$5,000-$25,000",
    deadline: "2026-02-10",
    projectTypes: ["program", "capital"]
  },
  // ...more grants
];

function scoreGrant(user, grant) {
  let score = 0;
  let reasons = [];
  // Mission alignment
  if (user.mission && grant.mission && user.mission.toLowerCase().includes(grant.mission.toLowerCase())) {
    score += 30;
    reasons.push("Mission alignment");
  }
  // Eligibility
  if (grant.eligibility.includes(user.organizationType)) {
    score += 20;
    reasons.push("Eligible organization type");
  }
  // Location
  if (grant.location.some(loc => user.location && user.location.includes(loc))) {
    score += 15;
    reasons.push("Location match");
  }
  // Amount
  if (grant.amountRange && user.fundingAmountNeeded) {
    // Simple check: if user amount is within range string
    const [min, max] = grant.amountRange.replace(/[^\d\-]/g, '').split('-').map(Number);
    if (user.fundingAmountNeeded >= min && user.fundingAmountNeeded <= max) {
      score += 15;
      reasons.push("Funding amount in range");
    }
  }
  // Deadline proximity
  if (grant.deadline) {
    const days = (new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days < 60) {
      score += 10;
      reasons.push("Upcoming deadline");
    }
  }
  // Project type
  if (grant.projectTypes && user.projectType && grant.projectTypes.includes(user.projectType)) {
    score += 10;
    reasons.push("Project type fit");
  }
  return { score, reason: reasons.join(", ") };
}

export default {
  name: "GrantMatchingAgent",
  description: "Matches user projects/orgs to relevant grants using structured criteria, memory, and external data.",
  capabilities: ["grant matching", "scoring", "memory integration"],
  handler: async (input, memory, userId = "default") => {
    // Parse user input (assume structured for now)
    const user = {
      organizationType: input.organizationType,
      mission: input.mission,
      projectDescription: input.projectDescription,
      fundingAmountNeeded: input.fundingAmountNeeded,
      location: input.location,
      timeline: input.timeline,
      projectType: input.projectType,
      pastGrants: GrantMemory.getValidationNotes(userId, memory),
    };
    // Save project details to GrantMemory
    GrantMemory.getPlan(userId, memory) || GrantMemory.getDraft(userId, memory);
    // Score and match
    const matches = GRANT_DATASET.map(grant => {
      const { score, reason } = scoreGrant(user, grant);
      return { ...grant, score, reason };
    })
      .filter(g => g.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(g => ({
        grantName: g.grantName,
        funder: g.funder,
        deadline: g.deadline,
        amountRange: g.amountRange,
        score: g.score,
        reason: g.reason
      }));
    // Save matches for future workflows
    memory.GrantMemory[`${userId}_grantMatches`] = matches;
    // Output
    return {
      output: {
        matches,
        summary: `${matches.length} strong matches found`
      },
      metadata: { step: "grant-matching" },
      updatedMemory: memory
    };
  }
};
