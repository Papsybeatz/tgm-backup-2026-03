// PlannerAgent.js
export default {
  name: "PlannerAgent",
  description: "Breaks down grant requirements, extracts inputs, and creates a structured plan.",
  capabilities: ["planning", "input extraction"],
  handler: async (input, memory) => {
    // Simulate planning logic
    return {
      output: `Plan for: ${input}`,
      metadata: { step: "planning" },
      updatedMemory: memory
    };
  }
};
