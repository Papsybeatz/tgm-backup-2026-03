// DraftAgent.js
export default {
  name: "DraftAgent",
  description: "Generates the first full draft based on the plan.",
  capabilities: ["drafting"],
  handler: async (input, memory) => {
    // Simulate draft generation
    return {
      output: `Draft based on: ${input}`,
      metadata: { step: "drafting" },
      updatedMemory: memory
    };
  }
};
